import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar } from '../services/vector.service.js';

export default async function v1Routes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireApiKey);

  // GET /files
  fastify.get('/files', async (request, reply) => {
    const userId = request.user!.id;
    const files = await db.select({
      id: schema.files.id,
      name: schema.files.name,
      mimeType: schema.files.mimeType,
      size: schema.files.size,
      status: schema.files.status,
      summary: schema.files.summary,
      suggestedFolder: schema.files.suggestedFolder,
      createdAt: schema.files.createdAt,
    })
      .from(schema.files)
      .where(eq(schema.files.userId, userId))
      .orderBy(desc(schema.files.createdAt));
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

  // GET /search
  fastify.get('/search', async (request, reply) => {
    const query = request.query as { q: string };
    if (!query.q) return reply.status(400).send({ error: 'q parameter required' });
    const userId = request.user!.id;

    const [queryVec] = await embedTexts([query.q]);
    const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 10 });

    return reply.send({
      results: chunks.map(c => ({
        fileId: c.fileId,
        fileName: c.fileName,
        text: c.text.slice(0, 300),
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
      limit: 6,
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
