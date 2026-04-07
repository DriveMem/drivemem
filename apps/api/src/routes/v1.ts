import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar } from '../services/vector.service.js';
import { s3Client } from '../services/s3.service.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../lib/config.js';
import crypto from 'crypto';
import { Queue } from 'bullmq';

export default async function v1Routes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireApiKey);

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
      .where(eq(schema.files.userId, userId))
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
  fastify.delete('/files/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    if (!file) return reply.status(404).send({ error: 'File not found' });
    await db.delete(schema.files).where(eq(schema.files.id, id));
    return reply.status(204).send();
  });

  // GET /search — max_tokens limits snippet length
  fastify.get('/search', async (request, reply) => {
    const query = request.query as { q: string; max_tokens?: string };
    if (!query.q) return reply.status(400).send({ error: 'q parameter required' });
    const userId = request.user!.id;
    const maxChars = Math.min(parseInt(query.max_tokens || '300') * 4, 2000); // ~4 chars per token

    const [queryVec] = await embedTexts([query.q]);
    const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 10 });

    return reply.send({
      results: chunks.map(c => ({
        fileId: c.fileId,
        fileName: c.fileName,
        text: c.text.slice(0, maxChars),
        score: c.score,
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
  fastify.post('/files/upload', async (request, reply) => {
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
    const body = request.body as { question: string; fileIds?: string[] };
    if (!body.question) return reply.status(400).send({ error: 'question is required' });

    const [queryVec] = await embedTexts([body.question]);
    const scopeType = body.fileIds?.length ? 'file' : 'all';
    const chunks = await searchSimilar({
      userId,
      query: queryVec,
      scopeType,
      scopeId: body.fileIds?.[0],
      limit: 10,
    });

    const citationSources = chunks.map(
      (c, i) => `来源 ${i + 1} (${c.fileName} 第${c.chunkIndex + 1}段): ${c.text}`,
    );

    const systemPrompt = `你是 AI Drive 的文档 AI 助手。严格基于文档内容回答。引用来源。\n\n[文档片段]\n${citationSources.join('\n\n') || '（未找到相关文档）'}`;

    const { chat } = await import('../services/llm.service.js');
    const answer = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: body.question },
    ]);

    return reply.send({
      answer,
      sources: chunks.map(c => ({
        fileId: c.fileId,
        fileName: c.fileName,
        chunkIndex: c.chunkIndex,
        text: c.text.slice(0, 200),
        score: c.score,
      })),
    });
  });
}
