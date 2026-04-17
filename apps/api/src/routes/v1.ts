import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql, inArray, gte } from 'drizzle-orm';
import { requireApiKey, requireScope } from '../plugins/api-key-auth.js';
import { fetchTimeline } from './timeline.js';
import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar } from '../services/vector.service.js';
import { s3Client } from '../services/s3.service.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../lib/config.js';
import crypto from 'crypto';
import { Queue } from 'bullmq';
import { logActivity } from '../services/activity-logger.js';
import { recordSearchResults, resolveImplicitFeedback } from '../services/implicit-feedback.js';
import { checkCompilationFeedback } from '../services/context-compiler/index.js';

// --- Levenshtein similarity for auto-store dedup ---
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

export default async function v1Routes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireApiKey);

  // GET /users/me/profile
  fastify.get('/users/me/profile', async (request, reply) => {
    const userId = request.user!.id;
    const [user] = await db.select({ profile: schema.users.profile, name: schema.users.name, email: schema.users.email, onboardingCompleted: schema.users.onboardingCompleted, onboardingStep: schema.users.onboardingStep })
      .from(schema.users).where(eq(schema.users.id, userId));
    if (!user) return reply.status(404).send({ error: 'User not found' });
    const profile = (user.profile as Record<string, any>) || {};
    return reply.send({ ...profile, name: user.name, email: user.email, onboardingCompleted: user.onboardingCompleted, onboardingStep: user.onboardingStep });
  });

  // PATCH /users/me/onboarding
  fastify.patch('/users/me/onboarding', async (request, reply) => {
    const user = (request as any).user;
    const body = request.body as { step?: number; completed?: boolean };

    const updates: Record<string, any> = {};
    if (typeof body.step === 'number') updates.onboardingStep = body.step;
    if (typeof body.completed === 'boolean') updates.onboardingCompleted = body.completed;

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ error: 'No valid fields to update' });
    }

    const [updated] = await db.update(schema.users).set(updates).where(eq(schema.users.id, user.id)).returning({
      onboardingStep: schema.users.onboardingStep,
      onboardingCompleted: schema.users.onboardingCompleted
    });

    return { onboarding: updated };
  });

  // PATCH /users/me/profile
  fastify.patch('/users/me/profile', async (request, reply) => {
    const body = request.body as { role?: string; currentGoal?: string; background?: string; preferences?: string };
    const userId = request.user!.id;
    const [user] = await db.select({ profile: schema.users.profile }).from(schema.users).where(eq(schema.users.id, userId));
    const existingProfile = (user?.profile as Record<string, any>) || {};
    const newProfile = { ...existingProfile, ...body };
    await db.update(schema.users).set({ profile: newProfile, updatedAt: new Date() }).where(eq(schema.users.id, userId));
    return reply.send(newProfile);
  });

  // GET /files — detail=brief|full (default: full)
  fastify.get('/files', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { detail?: string };
    const brief = query.detail === 'brief';

    const files = await db.select({
      id: schema.files.id,
      name: schema.files.name,
      mimeType: schema.files.mimeType,
      size: schema.files.size,
      status: schema.files.status,
      summary: schema.files.summary,
      ...(brief ? {} : { suggestedFolder: schema.files.suggestedFolder }),
      createdAt: schema.files.createdAt,
    })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), sql`${schema.files.archivedAt} IS NULL`))
      .orderBy(desc(schema.files.createdAt));

    if (brief) {
      return reply.send({ files: files.map(f => ({ id: f.id, name: f.name, status: f.status, summary: f.summary?.slice(0, 100) })) });
    }
    return reply.send({ files });
  });

  // GET /files/:id
  fastify.get('/files/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [file] = await db.select()
      .from(schema.files)
      .where(and(eq(schema.files.id, id), eq(schema.files.userId, request.user!.id)));
    if (!file) return reply.status(404).send({ error: 'File not found' });
    return reply.send({ file });
  });

  // DELETE /files/:id
  fastify.delete('/files/:id', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    if (!file) return reply.status(404).send({ error: 'File not found' });
    await db.delete(schema.files).where(eq(schema.files.id, id));
    // Dispatch webhook: file.deleted
    try {
      const { dispatchWebhook } = await import('../services/webhook.service.js');
      await dispatchWebhook(userId, 'file.deleted', { fileId: id, fileName: file.name });
    } catch {}
    return reply.status(204).send();
  });

  // PATCH /files/:id — 更新文件元数据（名称、标签）
  fastify.patch('/files/:id', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const body = request.body as { name?: string; tags?: string[] };

    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    if (!file) return reply.status(404).send({ error: 'File not found' });

    // Update name
    if (body.name !== undefined) {
      if (!body.name || body.name.trim() === '') return reply.status(400).send({ error: 'name cannot be empty' });
      await db.update(schema.files).set({ name: body.name.trim(), updatedAt: new Date() }).where(eq(schema.files.id, id));
    }

    // Update tags (replace all)
    if (body.tags !== undefined) {
      // Delete existing file_tags
      await db.delete(schema.fileTags).where(eq(schema.fileTags.fileId, id));
      // Insert new tags
      const tagColors: Record<string, string> = {
        decision: '#F59E0B', meeting: '#8B5CF6', note: '#A855F7',
        research: '#EC4899', report: '#10B981', spec: '#3B82F6',
      };
      for (const tagName of body.tags.slice(0, 10)) {
        if (!tagName || tagName.trim() === '') continue;
        const trimmed = tagName.trim();
        let [existingTag] = await db.select().from(schema.tags)
          .where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, trimmed)));
        if (!existingTag) {
          [existingTag] = await db.insert(schema.tags).values({
            name: trimmed, color: tagColors[trimmed] || '#6B7280', userId,
          }).returning();
        }
        if (existingTag) {
          await db.insert(schema.fileTags).values({ fileId: id, tagId: existingTag.id });
        }
      }
    }

    const [updated] = await db.select().from(schema.files).where(eq(schema.files.id, id));
    return reply.send({ file: updated });
  });

  // PUT /files/:id/content — 替换文件内容
  fastify.put('/files/:id/content', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    if (!file) return reply.status(404).send({ error: 'File not found' });

    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file provided' });

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk as Buffer);
    const buffer = Buffer.concat(chunks);
    const size = buffer.length;
    let mimeType = data.mimetype;
    if (mimeType === 'application/octet-stream') {
      const ext = data.filename.split('.').pop()?.toLowerCase() || '';
      const mimeMap: Record<string, string> = {
        'md': 'text/markdown', 'txt': 'text/plain', 'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      mimeType = mimeMap[ext] || mimeType;
    }

    // Upload to S3 (overwrite)
    await s3Client.send(new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: file.s3Key,
      Body: buffer,
      ContentType: mimeType,
    }));

    // Update file record: reset status, update size/mime
    const sizeDiff = size - Number(file.size);
    await db.update(schema.files).set({
      size, mimeType, status: 'parsing', errorMessage: null,
      chunkCount: 0, summary: null, updatedAt: new Date(),
    }).where(eq(schema.files.id, id));

    // Update storage used
    if (sizeDiff !== 0) {
      await db.update(schema.users).set({ storageUsed: sql`${schema.users.storageUsed} + ${sizeDiff}` }).where(eq(schema.users.id, userId));
    }

    // Delete old embeddings/chunks from Qdrant will happen during re-parse
    // Enqueue parse job
    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    await queue.add('parse', { fileId: id, userId, s3Key: file.s3Key, mimeType });
    await queue.close();

    const [updated] = await db.select().from(schema.files).where(eq(schema.files.id, id));
    return reply.send({ file: updated });
  });

  // POST /files/batch — 批量操作
  fastify.post('/files/batch', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const body = request.body as { action: string; fileIds: string[] };
    const userId = request.user!.id;

    if (!body.action || !['delete', 'archive', 'unarchive'].includes(body.action)) {
      return reply.status(400).send({ error: 'action must be delete, archive, or unarchive' });
    }
    if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
      return reply.status(400).send({ error: 'fileIds is required' });
    }
    if (body.fileIds.length > 50) {
      return reply.status(400).send({ error: 'fileIds max 50' });
    }

    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const fileId of body.fileIds) {
      try {
        const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, fileId), eq(schema.files.userId, userId)));
        if (!file) {
          failed.push({ id: fileId, error: 'File not found' });
          continue;
        }

        switch (body.action) {
          case 'delete':
            await db.delete(schema.files).where(eq(schema.files.id, fileId));
            try {
              const { dispatchWebhook } = await import('../services/webhook.service.js');
              await dispatchWebhook(userId, 'file.deleted', { fileId, fileName: file.name });
            } catch {}
            break;
          case 'archive':
            await db.update(schema.files).set({ archivedAt: new Date() }).where(eq(schema.files.id, fileId));
            break;
          case 'unarchive':
            await db.update(schema.files).set({ archivedAt: null }).where(eq(schema.files.id, fileId));
            break;
        }
        success.push(fileId);
      } catch (err) {
        failed.push({ id: fileId, error: (err as Error).message });
      }
    }

    return reply.send({ success, failed });
  });

  // PATCH /files/:id/archive — 归档文件
  fastify.patch('/files/:id/archive', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    await db.update(schema.files).set({ archivedAt: new Date() }).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    return reply.send({ message: 'archived' });
  });

  // PATCH /files/:id/unarchive — 取消归档
  fastify.patch('/files/:id/unarchive', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    await db.update(schema.files).set({ archivedAt: null }).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    return reply.send({ message: 'unarchived' });
  });

  // POST /files/:id/feedback — rate a knowledge item (API Key auth)
  fastify.post('/files/:id/feedback', async (request, reply) => {
    const userId = request.user!.id;
    const fileId = (request.params as any).id;
    const body = request.body as { rating: string; context?: string };

    if (!body?.rating || !['useful', 'not_useful'].includes(body.rating)) {
      return reply.status(400).send({ error: 'rating must be "useful" or "not_useful"' });
    }

    await db.delete(schema.knowledgeFeedback)
      .where(and(eq(schema.knowledgeFeedback.fileId, fileId), eq(schema.knowledgeFeedback.userId, userId)));

    await db.insert(schema.knowledgeFeedback).values({
      fileId,
      userId,
      rating: body.rating,
      context: body.context || null,
    });

    return reply.send({ success: true, rating: body.rating });
  });

  // GET /files/:id/feedback (API Key auth)
  fastify.get('/files/:id/feedback', async (request, reply) => {
    const userId = request.user!.id;
    const fileId = (request.params as any).id;

    const [feedback] = await db.select()
      .from(schema.knowledgeFeedback)
      .where(and(eq(schema.knowledgeFeedback.fileId, fileId), eq(schema.knowledgeFeedback.userId, userId)));

    return reply.send({ rating: feedback?.rating || null });
  });

  // GET /search — max_tokens limits snippet length
  fastify.get('/search', async (request, reply) => {
    const query = request.query as { q: string; max_tokens?: string; format?: string; contextBudget?: string };
    if (!query.q) return reply.status(400).send({ error: 'q parameter required' });
    const userId = request.user!.id;
    const format = query.format || 'text'; // text | structured | summary
    const budget = parseInt(query.contextBudget || '0');
    const maxChars = budget ? Math.min(budget * 4, 8000) : Math.min(parseInt(query.max_tokens || '300') * 4, 2000);

    const { preprocessQuery } = await import("../services/vector.service.js");
    const [queryVec] = await embedTexts([preprocessQuery(query.q)]);
    const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 10 });

    // Filter archived files from search results
    const searchFiles = await db.select({ id: schema.files.id, archivedAt: schema.files.archivedAt })
      .from(schema.files).where(eq(schema.files.userId, userId));
    const searchArchivedIds = new Set(searchFiles.filter(f => f.archivedAt).map(f => f.id));
    let searchResults = chunks.filter(c => !searchArchivedIds.has(c.fileId));

    // Apply feedback weights
    const { applyFeedbackWeights } = await import('../services/feedback-weights.js');
    searchResults = await applyFeedbackWeights(userId, searchResults);

    // Get file dates
    const searchFileIds = [...new Set(searchResults.map(c => c.fileId))];
    const fileDates: Record<string, Date> = {};
    for (const fid of searchFileIds) {
      const [f] = await db.select({ id: schema.files.id, createdAt: schema.files.createdAt }).from(schema.files).where(eq(schema.files.id, fid));
      if (f) fileDates[f.id] = f.createdAt;
    }

        if (format === 'summary') {
      return reply.send({
        results: searchResults.map(c => ({
          fileName: c.fileName,
          score: c.score,
          summary: c.text.slice(0, 80).replace(/\n/g, ' '),
        })),
      });
    }

    const searchFileIdSet = [...new Set(searchResults.map(c => c.fileId))];
    // Track file access for freshness decay
    if (searchFileIdSet.length > 0) {
      db.update(schema.files)
        .set({ lastAccessedAt: new Date() })
        .where(inArray(schema.files.id, searchFileIdSet))
        .catch(() => {});
    }
    logActivity({ userId, apiKeyId: (request as any).apiKeyId, agentName: (request as any).apiKeyName, action: 'search', detail: query.q, metadata: { resultCount: searchResults.length, format }, relatedFileIds: searchFileIdSet });
    // Agent Loop 1: record search results for implicit feedback tracking
    recordSearchResults(userId, (request as any).apiKeyId, searchFileIdSet);
    // Agent Loop 4: check if search after compile → negative feedback signal
    checkCompilationFeedback(userId, 'search');
    return reply.send({
      results: searchResults.map(c => ({
        fileId: c.fileId,
        fileName: c.fileName,
        text: c.text.slice(0, maxChars),
        score: c.score,
        createdAt: fileDates[c.fileId] || null,
      })),
    });
  });

  // GET /insights
  fastify.get('/insights', async (request, reply) => {
    const userId = request.user!.id;
    const results = await db.select()
      .from(schema.insights)
      .where(eq(schema.insights.userId, userId))
      .orderBy(desc(schema.insights.createdAt))
      .limit(20);

    const fileIds = [...new Set(results.flatMap(r => [r.sourceFileId, r.relatedFileId]))];
    const fileNames: Record<string, string> = {};
    for (const fid of fileIds) {
      const [f] = await db.select({ id: schema.files.id, name: schema.files.name }).from(schema.files).where(eq(schema.files.id, fid));
      if (f) fileNames[f.id] = f.name;
    }

    return reply.send({
      insights: results.map(r => ({
        ...r,
        sourceFileName: fileNames[r.sourceFileId] || 'Unknown',
        relatedFileName: fileNames[r.relatedFileId] || 'Unknown',
      })),
    });
  });

  // POST /files/upload — direct file upload (multipart)
  fastify.post('/files/upload', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const userId = request.user!.id;
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file provided' });

    const filename = data.filename;
    let mimeType = data.mimetype;
    // Fallback MIME detection from extension if octet-stream
    if (mimeType === 'application/octet-stream') {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const mimeMap: Record<string, string> = {
        'md': 'text/markdown', 'txt': 'text/plain', 'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      mimeType = mimeMap[ext] || mimeType;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk as Buffer);
    const buffer = Buffer.concat(chunks);
    const size = buffer.length;

    const fileId = crypto.randomUUID();
    const s3Key = `users/${userId}/files/${fileId}/${filename}`;

    // Upload to S3/MinIO
    await s3Client.send(new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
    }));

    // Check existing same-name file for version detection
    const existingFiles = await db.select({ id: schema.files.id, name: schema.files.name })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), eq(schema.files.name, filename)));

    let previousVersionId: string | null = null;
    if (existingFiles.length > 0) {
      const old = existingFiles[0];
      previousVersionId = old.id;
      const ext = old.name.lastIndexOf('.') > -1 ? old.name.substring(old.name.lastIndexOf('.')) : '';
      const baseName = old.name.lastIndexOf('.') > -1 ? old.name.substring(0, old.name.lastIndexOf('.')) : old.name;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      await db.update(schema.files).set({ name: `${baseName}_${timestamp}${ext}` }).where(eq(schema.files.id, old.id));
    }

    // Insert file record
    await db.insert(schema.files).values({
      id: fileId,
      name: filename,
      originalName: filename,
      mimeType,
      size,
      status: 'parsing',
      userId,
      s3Key,
      previousVersionId,
    });

    // Update storage
    await db.update(schema.users).set({ storageUsed: sql`${schema.users.storageUsed} + ${size}` }).where(eq(schema.users.id, userId));

    // Enqueue parse job
    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    await queue.add('parse', { fileId, userId, s3Key, mimeType });
    await queue.close();

    return reply.status(201).send({ fileId, name: filename, status: 'parsing' });
  });

  // POST /ask — sync AI Q&A
  fastify.post('/ask', async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { question: string; fileIds?: string[]; contextBudget?: number; preferFormat?: string };
    if (!body.question) return reply.status(400).send({ error: 'question is required' });

    const { preprocessQuery: ppq } = await import("../services/vector.service.js");
    const [queryVec] = await embedTexts([ppq(body.question)]);
    const scopeType = body.fileIds?.length ? 'file' : 'all';
    const chunks = await searchSimilar({
      userId,
      query: queryVec,
      scopeType,
      scopeId: body.fileIds?.[0],
      limit: 10,
    });

    // Filter out archived + old version files
    const userFiles = await db.select({ id: schema.files.id, previousVersionId: schema.files.previousVersionId, archivedAt: schema.files.archivedAt })
      .from(schema.files).where(eq(schema.files.userId, userId));
    const oldVersionIds = new Set(userFiles.filter(f => f.previousVersionId).map(f => f.previousVersionId));
    const archivedIds = new Set(userFiles.filter(f => f.archivedAt).map(f => f.id));
    const filteredChunks = chunks.filter(c => !oldVersionIds.has(c.fileId) && !archivedIds.has(c.fileId));
    const finalChunks = filteredChunks.length > 0 ? filteredChunks : chunks;

    const citationSources = finalChunks.map(
      (c, i) => `来源 ${i + 1} (${c.fileName} 第${c.chunkIndex + 1}段): ${c.text}`,
    );

    const askBudget = body.contextBudget || 0;
    const askFormat = body.preferFormat || 'text';
    const lengthHint = askBudget && askBudget < 1000 ? `\n请简洁回答，控制在 ${askBudget} 字以内。` : '';
    const formatHint = askFormat === 'summary' ? '\n用要点列表回答。' : askFormat === 'structured' ? '\n用 JSON 格式回答：{"answer":"...","keyPoints":["..."],"confidence":"high/medium/low"}' : '';
    const systemPrompt = `你是 AI Drive AI，用户的个人知识助手。严格基于文档内容回答。用上标¹²³引用来源。${lengthHint}${formatHint}\n\n[文档片段]\n${citationSources.join('\n\n') || '（未找到相关文档）'}`;

    const { chat } = await import('../services/llm.service.js');
    const answer = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: body.question },
    ]);

    // Agent Loop 1: resolve implicit feedback for files referenced in ask
    const askFileIds = [...new Set(finalChunks.map(c => c.fileId))];
    resolveImplicitFeedback(userId, (request as any).apiKeyId, askFileIds);
    // Agent Loop 4: check if ask after compile → negative feedback signal
    checkCompilationFeedback(userId, 'ask');
    logActivity({ userId, apiKeyId: (request as any).apiKeyId, agentName: (request as any).apiKeyName, action: 'ask', detail: body.question, metadata: { sourceCount: finalChunks.length } });
    return reply.send({
      answer,
      sources: finalChunks.map(c => ({
        fileId: c.fileId,
        fileName: c.fileName,
        chunkIndex: c.chunkIndex,
        text: c.text.slice(0, 200),
        score: c.score,
      })),
    });
  });

  // POST /store — lightweight knowledge storage (mirrors MCP aidrive_store)
  fastify.post('/store', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { content: string; title?: string; tags?: string };
    if (!body.content) return reply.status(400).send({ error: 'content is required' });

    let title = body.title || '';
    if (!title) {
      try {
        const { chat: llmChat } = await import('../services/llm.service.js');
        const generated = await llmChat([
          { role: 'system', content: 'Generate a short, descriptive title (max 8 words, English) for this note. Return ONLY the title, no quotes.' },
          { role: 'user', content: body.content.slice(0, 500) },
        ]);
        title = generated.trim().replace(/^["']|["']$/g, '').slice(0, 80) || body.content.slice(0, 30).replace(/\n/g, ' ');
      } catch {
        title = body.content.slice(0, 30).replace(/\n/g, ' ');
      }
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `note-${timestamp}.md`;
    const mdContent = `# ${title}\n\n${body.content}\n\n---\n_存入时间: ${new Date().toLocaleString('zh-CN')}_`;
    
    // Auto-detect project
    const { detectProject } = await import('../services/project-detector.js');
    const detection = await detectProject(userId, {
      explicitProjectId: (body as any).projectId,
      apiKeyId: (request as any).apiKeyId,
      content: body.content,
    });

    const { randomUUID } = await import('crypto');
    const fileId = randomUUID();
    const s3Key = `users/${userId}/files/${fileId}/${filename}`;
    const buffer = Buffer.from(mdContent, 'utf-8');
    
    const { uploadObject } = await import('../services/s3.service.js');
    await uploadObject(s3Key, buffer, 'text/markdown');
    
    await db.insert(schema.files).values({
      id: fileId, name: title, originalName: filename,
      mimeType: 'text/markdown', size: buffer.length,
      status: 'parsing', userId, s3Key,
      folderId: detection.projectId,
    });
    
    const { Queue } = await import('bullmq');
    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
    await queue.close();
    
    // Agent Loop 1: store action implies the agent is actively working — resolve any pending feedback for this user
    resolveImplicitFeedback(userId, (request as any).apiKeyId, [fileId]);
    logActivity({ userId, apiKeyId: (request as any).apiKeyId, agentName: (request as any).apiKeyName, action: 'store', detail: title, metadata: { projectDetection: { method: detection.method, project: detection.projectName, confidence: detection.confidence } } });

    // Auto-handoff: dispatch webhook with compiled context
    try {
      const { dispatchWebhook } = await import('../services/webhook.service.js');
      const { compileContext } = await import('../services/context-compiler/index.js');

      // Compile brief context around what was just stored
      const compiled = await compileContext(userId, { task: title, tokenBudget: 2000 });

      await dispatchWebhook(userId, 'knowledge.stored', {
        fileId,
        title,
        storedBy: (request as any).apiKeyName || 'user',
        compiledContext: compiled.compiledContext,
        metadata: {
          fragmentCount: compiled.metadata.fragmentCount,
          coverage: compiled.metadata.coverage,
        },
      });
    } catch { /* don't block store on webhook failure */ }

    // Async relationship discovery (non-blocking)
    import('../services/knowledge-graph.js').then(({ discoverRelationships }) => {
      discoverRelationships(userId, fileId, body.content).catch(console.error);
    }).catch(() => {});

    return reply.status(201).send({ fileId, title, message: `Stored "${title}"` });
  });

  // GET /timeline
  fastify.get('/timeline', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string; cursor?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const cursor = query.cursor || undefined;

    const result = await fetchTimeline(userId, limit, cursor);
    return reply.send(result);
  });

  // GET /context-packet — generate a context packet for cross-model task handoff
  fastify.get('/context-packet', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { folderId?: string; format?: string };
    const folderId = query.folderId;
    if (!folderId) return reply.status(400).send({ error: 'folderId parameter is required' });
    const format = query.format === 'json' ? 'json' : 'markdown';

    // 1. Get all files in this folder
    const folderFiles = await db.select({
      id: schema.files.id,
      name: schema.files.name,
      summary: schema.files.summary,
      status: schema.files.status,
    })
      .from(schema.files)
      .where(and(
        eq(schema.files.userId, userId),
        eq(schema.files.folderId, folderId),
        sql`${schema.files.archivedAt} IS NULL`,
      ))
      .orderBy(desc(schema.files.createdAt));

    if (folderFiles.length === 0) {
      return reply.status(404).send({ error: 'No files found in this folder' });
    }

    // Get folder info for project context
    const [folderInfo] = await db.select()
      .from(schema.folders)
      .where(and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId)));

    const fileIds = folderFiles.map(f => f.id);

    // 2. Get related insights
    const relatedInsights = await db.select({
      title: schema.insights.title,
      description: schema.insights.description,
    })
      .from(schema.insights)
      .where(and(
        eq(schema.insights.userId, userId),
        sql`(${schema.insights.sourceFileId} IN (${sql.join(fileIds.map(id => sql`${id}`), sql`,`)}) OR ${schema.insights.relatedFileId} IN (${sql.join(fileIds.map(id => sql`${id}`), sql`,`)}))`,
      ))
      .orderBy(desc(schema.insights.createdAt))
      .limit(20);

    // 3. Build prompt and call LLM
    const filesSection = folderFiles.map(f => `- ${f.name}: ${f.summary || '无摘要'}`).join('\n');
    const insightsSection = relatedInsights.length > 0
      ? relatedInsights.map(i => `- ${i.title}: ${i.description}`).join('\n')
      : '无';

    const prompt = `你是一个 AI 知识助手。请基于以下项目文件和 AI 洞察，生成一份精炼的项目交接包。

## 项目信息
名称: ${folderInfo?.name || '未知'}
简介: ${folderInfo?.brief || '未设置'}
状态: ${folderInfo?.status || '进行中'}
目标: ${folderInfo?.goal || '未设置'}

## 项目文件
${filesSection}

## AI 发现的关联
${insightsSection}

请生成以下格式的交接包：
# 项目概要
（一句话描述项目）

## 当前状态
（项目做到哪了）

## 关键决策
（已做出的重要决定）

## 待解决问题
（还没解决的问题）

## 关键文件
（最重要的几个文件及其摘要）

## 建议下一步
（下一步应该做什么）`;

    const { chat } = await import('../services/llm.service.js');
    const packet = await chat([{ role: 'user', content: prompt }]);

    if (format === 'json') {
      // Parse markdown sections into structured fields
      const sections: Record<string, string> = {};
      const sectionRegex = /^#{1,2}\s+(.+)$/gm;
      const parts = packet.split(sectionRegex);
      for (let i = 1; i < parts.length; i += 2) {
        const key = parts[i].trim();
        const value = (parts[i + 1] || '').trim();
        sections[key] = value;
      }
      return reply.send({
        format: 'json',
        folderId,
        fileCount: folderFiles.length,
        insightCount: relatedInsights.length,
        packet: sections,
        raw: packet,
      });
    }

    return reply.send({
      format: 'markdown',
      folderId,
      fileCount: folderFiles.length,
      insightCount: relatedInsights.length,
      packet,
    });
  });

  // GET /agent/capabilities — auto-detect agent role and domain
  fastify.get('/agent/capabilities', { preHandler: [requireApiKey] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { task?: string };
    const { detectCapabilities } = await import('../services/capability-detector.js');
    const capabilities = await detectCapabilities(userId, {
      agentName: (request as any).apiKeyName,
      headers: {
        'user-agent': request.headers['user-agent'],
        'x-agent-name': request.headers['x-agent-name'] as string | undefined,
      },
      taskText: query.task,
    });
    return reply.send(capabilities);
  });

  // Context Compiler
  fastify.post('/context/compile', { preHandler: [requireApiKey] }, async (request, reply) => {
    const { compileContext } = await import('../services/context-compiler/index.js');
    const body = request.body as any;
    if (!body?.task) return reply.status(400).send({ error: 'task is required' });
    const hints = body.hints || {};
    if (!hints.folderId && !hints.project) {
      const { detectProject } = await import('../services/project-detector.js');
      const detection = await detectProject(request.user!.id, {
        content: body.task,
        apiKeyId: (request as any).apiKeyId,
      });
      if (detection.projectId) {
        hints.folderId = detection.projectId;
      }
    }
    // Auto-detect role if not provided
    let role = body.role;
    if (!role) {
      try {
        const { detectCapabilities } = await import('../services/capability-detector.js');
        const detected = await detectCapabilities(request.user!.id, {
          agentName: (request as any).apiKeyName,
          headers: {
            'user-agent': request.headers['user-agent'],
            'x-agent-name': request.headers['x-agent-name'] as string | undefined,
          },
          taskText: body.task,
        });
        if (detected.role !== 'general' && detected.confidence > 0.3) {
          role = detected.role;
        }
      } catch { /* best-effort */ }
    }

    const result = await compileContext(request.user!.id, {
      task: body.task,
      model: body.model,
      tokenBudget: body.tokenBudget,
      since: body.since,
      depth: body.depth,
      role,
      apiKeyId: (request as any).apiKeyId,
      hints,
      format: body.format,
    });
    const compileFileIds = (result as any).sources?.map((s: any) => s.fileId).filter(Boolean) || [];
    // Agent Loop 1: resolve implicit feedback for files referenced in compile
    resolveImplicitFeedback(request.user!.id, (request as any).apiKeyId, [...new Set(compileFileIds)] as string[]);
    logActivity({ userId: request.user!.id, apiKeyId: (request as any).apiKeyId, agentName: (request as any).apiKeyName, action: 'compile', detail: body.task, relatedFileIds: [...new Set(compileFileIds)] as string[] });
    return reply.send(result);
  });

  // GET /compilations/stats — compilation quality dashboard data
  fastify.get('/compilations/stats', { preHandler: [requireApiKey] }, async (request, reply) => {
    const userId = request.user!.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const rows = await db.select({
      latencyMs: schema.compilationLogs.latencyMs,
      totalTokens: schema.compilationLogs.totalTokens,
      negativeFeedback: schema.compilationLogs.negativeFeedback,
    })
      .from(schema.compilationLogs)
      .where(and(
        eq(schema.compilationLogs.userId, userId),
        sql`${schema.compilationLogs.createdAt} >= ${sevenDaysAgo}`,
      ));

    const total = rows.length;
    const avgLatency = total > 0 ? Math.round(rows.reduce((s, r) => s + (r.latencyMs || 0), 0) / total) : 0;
    const avgTokens = total > 0 ? Math.round(rows.reduce((s, r) => s + (r.totalTokens || 0), 0) / total) : 0;
    const negativeCount = rows.filter(r => r.negativeFeedback).length;
    const negativeFeedbackRate = total > 0 ? +(negativeCount / total).toFixed(4) : 0;

    return reply.send({
      period: '7d',
      totalCompilations: total,
      avgLatencyMs: avgLatency,
      avgTokens,
      negativeFeedbackCount: negativeCount,
      negativeFeedbackRate,
    });
  });

  // GET /activity-flow — activities grouped by agent with flow detection
  fastify.get('/activity-flow', { preHandler: [requireApiKey] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 200);

    const activities = await db.select()
      .from(schema.apiActivityLogs)
      .where(eq(schema.apiActivityLogs.userId, userId))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(limit);

    // Group by agent
    const agentGroups: Record<string, any[]> = {};
    for (const a of activities) {
      const agent = a.agentName || 'You';
      if (!agentGroups[agent]) agentGroups[agent] = [];
      agentGroups[agent].push({
        id: a.id,
        action: a.action,
        detail: a.detail,
        createdAt: a.createdAt,
        relatedFileIds: a.relatedFileIds,
        metadata: a.metadata,
      });
    }

    // Build flow connections
    const fileAgentMap: Record<string, string> = {};
    for (const a of activities) {
      if (a.action === 'store' && a.metadata) {
        const fileId = (a.metadata as any).fileId;
        if (fileId) fileAgentMap[fileId] = a.agentName || 'You';
      }
    }

    const flowSet = new Set<string>();
    const flows: Array<{ from: string; to: string; fileCount: number; timestamp: string }> = [];
    for (const a of activities) {
      if ((a.action === 'search' || a.action === 'compile') && a.relatedFileIds) {
        const relatedIds = a.relatedFileIds as string[];
        for (const fid of relatedIds) {
          const sourceAgent = fileAgentMap[fid];
          const targetAgent = a.agentName || 'You';
          if (sourceAgent && sourceAgent !== targetAgent) {
            const key = `${sourceAgent}->${targetAgent}`;
            if (!flowSet.has(key)) {
              flowSet.add(key);
              flows.push({ from: sourceAgent, to: targetAgent, fileCount: 1, timestamp: a.createdAt?.toISOString() || '' });
            } else {
              const existing = flows.find(f => `${f.from}->${f.to}` === key);
              if (existing) existing.fileCount++;
            }
          }
        }
      }
    }

    return reply.send({ agents: agentGroups, flows, totalActivities: activities.length });
  });

  // POST /auto-capture — manually trigger auto-capture on a text
  fastify.post('/auto-capture', async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { content: string; sessionId?: string; projectId?: string };
    if (!body?.content) return reply.status(400).send({ error: 'content is required' });

    const { autoCapture } = await import('../services/auto-capture.js');
    const result = await autoCapture(userId, body.content, {
      sessionId: body.sessionId,
      projectId: body.projectId,
    });

    return reply.send(result);
  });

  // POST /auto-store — auto-store with dedup (Layer 3)
  fastify.post('/auto-store', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { content: string; title?: string; tags?: string; sessionId?: string };
    if (!body?.content) return reply.status(400).send({ error: 'content is required' });

    const title = body.title || body.content.slice(0, 40).replace(/\n/g, ' ');

    // Dedup: check for similar title from same user within 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFiles = await db.select({ id: schema.files.id, name: schema.files.name })
      .from(schema.files)
      .where(and(
        eq(schema.files.userId, userId),
        gte(schema.files.createdAt, twentyFourHoursAgo),
        sql`${schema.files.name} LIKE 'auto-capture-%' OR ${schema.files.name} LIKE 'auto-store-%'`,
      ));

    // Check Levenshtein similarity against recent auto-stored titles
    for (const f of recentFiles) {
      // Extract title from filename pattern: auto-capture-TIMESTAMP-type.md or auto-store-TIMESTAMP.md
      // For better matching, compare against the file name
      const existingTitle = f.name.replace(/^(auto-capture|auto-store)-[\dT-]+\.md$/, '').trim() || f.name;
      if (levenshteinSimilarity(title.toLowerCase(), existingTitle.toLowerCase()) > 0.8) {
        return reply.send({ deduplicated: true, existingFileId: f.id, message: 'Similar content was already auto-stored within 24h' });
      }
    }

    // Also do semantic dedup against content itself
    // Use existing autoCapture pipeline for extraction and storage
    const { autoCapture } = await import('../services/auto-capture.js');
    const result = await autoCapture(userId, body.content, {
      sessionId: body.sessionId,
    });

    // Log as auto_store activity
    if (result.captured > 0) {
      logActivity({
        userId,
        agentName: (request as any).apiKeyName || undefined,
        action: 'auto_store',
        detail: title,
        metadata: {
          source: 'auto_store',
          captured: result.captured,
          items: result.items,
          tags: body.tags || 'decision,analysis,engineering,product',
        },
      });

      // Auto-tag captured items
      const defaultTags = (body.tags || 'decision,analysis,engineering,product').split(',').map(t => t.trim()).filter(Boolean);
      const tagColors: Record<string, string> = {
        decision: '#F59E0B', analysis: '#8B5CF6', engineering: '#3B82F6', product: '#10B981',
      };
      for (const item of result.items) {
        for (const tagName of defaultTags.slice(0, 4)) {
          try {
            let [existingTag] = await db.select().from(schema.tags)
              .where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, tagName)));
            if (!existingTag) {
              [existingTag] = await db.insert(schema.tags).values({
                name: tagName, color: tagColors[tagName] || '#6B7280', userId,
              }).returning();
            }
            if (existingTag) {
              await db.insert(schema.fileTags).values({ fileId: item.fileId, tagId: existingTag.id });
            }
          } catch { /* skip duplicate tag */ }
        }
      }
    }

    return reply.send({
      ...result,
      source: 'auto_store',
    });
  });

  // GET /digest/weekly — weekly usage digest
  fastify.get('/digest/weekly', async (request, reply) => {
    const userId = request.user!.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // 1. Files stats
    const [filesStats] = await db.select({
      total: sql<number>`count(*)::int`,
      recent: sql<number>`count(*) filter (where ${schema.files.createdAt} >= ${sevenDaysAgo})::int`,
    }).from(schema.files).where(eq(schema.files.userId, userId));

    // 2. Conversations created
    const [convStats] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.conversations).where(and(
      eq(schema.conversations.userId, userId),
      gte(schema.conversations.createdAt, sevenDaysAgo),
    ));

    // 3. Insights discovered
    const [insightStats] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.insights).where(and(
      eq(schema.insights.userId, userId),
      sql`${schema.insights.createdAt} >= ${sevenDaysAgo}`,
    ));

    // 4. Recent insights detail
    const recentInsights = await db.select({
      title: schema.insights.title,
      createdAt: schema.insights.createdAt,
    }).from(schema.insights).where(and(
      eq(schema.insights.userId, userId),
      sql`${schema.insights.createdAt} >= ${sevenDaysAgo}`,
    )).orderBy(desc(schema.insights.createdAt)).limit(5);

    // 5. Agent calls (user messages in recent conversations as proxy)
    const [agentCallStats] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(schema.messages)
      .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
      .where(and(
        eq(schema.conversations.userId, userId),
        gte(schema.messages.createdAt, sevenDaysAgo),
        eq(schema.messages.role, 'user'),
      ));

    // 6. Storage used
    const [storageStats] = await db.select({
      totalBytes: sql<number>`coalesce(sum(${schema.files.size}), 0)::bigint`,
    }).from(schema.files).where(eq(schema.files.userId, userId));

    // 7. Top search topics from conversation titles
    const recentConvs = await db.select({
      title: schema.conversations.title,
    }).from(schema.conversations).where(and(
      eq(schema.conversations.userId, userId),
      gte(schema.conversations.createdAt, sevenDaysAgo),
    )).orderBy(desc(schema.conversations.createdAt)).limit(20);

    const topSearchTopics = recentConvs
      .map(c => c.title)
      .filter((t): t is string => Boolean(t) && t !== '新对话')
      .slice(0, 5);

    // 8. Active agents from API activity logs
    const activeAgentsRaw = await db.select({
      agentName: schema.apiActivityLogs.agentName,
      calls: sql<number>`count(*)::int`,
      lastUsedAt: sql<string>`max(${schema.apiActivityLogs.createdAt})`,
    }).from(schema.apiActivityLogs).where(and(
      eq(schema.apiActivityLogs.userId, userId),
      sql`${schema.apiActivityLogs.createdAt} >= ${sevenDaysAgo}`,
      sql`${schema.apiActivityLogs.agentName} IS NOT NULL`,
    )).groupBy(schema.apiActivityLogs.agentName)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return {
      period: { from: sevenDaysAgo.toISOString(), to: now.toISOString() },
      stats: {
        filesAdded: filesStats?.recent ?? 0,
        filesTotal: filesStats?.total ?? 0,
        agentCalls: agentCallStats?.count ?? 0,
        insightsDiscovered: insightStats?.count ?? 0,
        conversationsCreated: convStats?.count ?? 0,
        storageUsedMB: Math.round(Number(storageStats?.totalBytes ?? 0) / 1024 / 1024 * 10) / 10,
      },
      topSearchTopics,
      recentInsights: recentInsights.map(i => ({ title: i.title, createdAt: i.createdAt })),
      activeAgents: activeAgentsRaw.map(a => ({
        name: a.agentName,
        calls: a.calls,
        lastUsedAt: a.lastUsedAt,
      })),
    };
  });

  // GET /recent-auto-saved — return recently auto-saved entries
  fastify.get('/recent-auto-saved', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { since?: string; limit?: string };
    const since = query.since ? new Date(query.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const limit = Math.min(parseInt(query.limit || '50'), 100);

    // Get auto-captured files
    const files = await db.select({
      id: schema.files.id,
      name: schema.files.name,
      summary: schema.files.summary,
      status: schema.files.status,
      createdAt: schema.files.createdAt,
    })
      .from(schema.files)
      .where(and(
        eq(schema.files.userId, userId),
        gte(schema.files.createdAt, since),
        sql`${schema.files.name} LIKE 'auto-capture-%'`,
      ))
      .orderBy(desc(schema.files.createdAt))
      .limit(limit);

    // Get auto_store activities for richer metadata
    const activities = await db.select({
      id: schema.apiActivityLogs.id,
      action: schema.apiActivityLogs.action,
      detail: schema.apiActivityLogs.detail,
      metadata: schema.apiActivityLogs.metadata,
      agentName: schema.apiActivityLogs.agentName,
      createdAt: schema.apiActivityLogs.createdAt,
    })
      .from(schema.apiActivityLogs)
      .where(and(
        eq(schema.apiActivityLogs.userId, userId),
        eq(schema.apiActivityLogs.action, 'auto_store'),
        gte(schema.apiActivityLogs.createdAt, since),
      ))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(limit);

    return reply.send({
      files,
      activities,
      since: since.toISOString(),
    });
  });

  // GET /agents/connected — connected agents status
  fastify.get('/agents/connected', async (request, reply) => {
    const userId = request.user!.id;
    const now = new Date();
    const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 min
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const agents = await db.select({
      agentName: schema.apiActivityLogs.agentName,
      calls24h: sql<number>`count(*) filter (where ${schema.apiActivityLogs.createdAt} >= ${twentyFourHoursAgo})::int`,
      lastActiveAt: sql<string>`max(${schema.apiActivityLogs.createdAt})`,
    })
      .from(schema.apiActivityLogs)
      .where(and(
        eq(schema.apiActivityLogs.userId, userId),
        sql`${schema.apiActivityLogs.agentName} is not null`,
      ))
      .groupBy(schema.apiActivityLogs.agentName);

    return {
      agents: agents.map(a => ({
        name: a.agentName,
        status: new Date(a.lastActiveAt) >= onlineThreshold ? 'online' : 'offline',
        calls24h: a.calls24h,
        lastActiveAt: a.lastActiveAt,
      })),
      checkedAt: now.toISOString(),
    };
  });

}
