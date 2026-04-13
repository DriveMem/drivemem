import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { requireApiKey, requireScope } from '../plugins/api-key-auth.js';
import { fetchTimeline } from './timeline.js';
import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar } from '../services/vector.service.js';
import { s3Client } from '../services/s3.service.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../lib/config.js';
import crypto from 'crypto';
import { Queue } from 'bullmq';

export default async function v1Routes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireApiKey);

  // GET /users/me/profile
  fastify.get('/users/me/profile', async (request, reply) => {
    const userId = request.user!.id;
    const [user] = await db.select({ profile: schema.users.profile, name: schema.users.name, email: schema.users.email })
      .from(schema.users).where(eq(schema.users.id, userId));
    if (!user) return reply.status(404).send({ error: 'User not found' });
    const profile = (user.profile as Record<string, any>) || {};
    return reply.send({ ...profile, name: user.name, email: user.email });
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
    const searchResults = chunks.filter(c => !searchArchivedIds.has(c.fileId));

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
    const systemPrompt = `你是 DriveMem AI，用户的个人知识助手。严格基于文档内容回答。用上标¹²³引用来源。${lengthHint}${formatHint}\n\n[文档片段]\n${citationSources.join('\n\n') || '（未找到相关文档）'}`;

    const { chat } = await import('../services/llm.service.js');
    const answer = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: body.question },
    ]);

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

    const title = body.title || body.content.slice(0, 30).replace(/\n/g, ' ');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `note-${timestamp}.md`;
    const mdContent = `# ${title}\n\n${body.content}\n\n---\n_存入时间: ${new Date().toLocaleString('zh-CN')}_`;
    
    const { randomUUID } = await import('crypto');
    const fileId = randomUUID();
    const s3Key = `users/${userId}/files/${fileId}/${filename}`;
    const buffer = Buffer.from(mdContent, 'utf-8');
    
    const { uploadObject } = await import('../services/s3.service.js');
    await uploadObject(s3Key, buffer, 'text/markdown');
    
    await db.insert(schema.files).values({
      id: fileId, name: filename, originalName: filename,
      mimeType: 'text/markdown', size: buffer.length,
      status: 'parsing', userId, s3Key,
    });
    
    const { Queue } = await import('bullmq');
    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
    await queue.close();
    
    return reply.status(201).send({ fileId, title, message: `已存入「${title}」` });
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
}
