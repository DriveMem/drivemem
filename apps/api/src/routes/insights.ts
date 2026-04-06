import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function insightRoutes(fastify: FastifyInstance) {
  // GET / — 洞察列表
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '10'), 50);
    const offset = parseInt(query.offset || '0');
    
    const results = await db.select()
      .from(schema.insights)
      .where(eq(schema.insights.userId, userId))
      .orderBy(desc(schema.insights.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Enrich with file names
    const fileIds = [...new Set(results.flatMap(r => [r.sourceFileId, r.relatedFileId]))];
    const fileNames: Record<string, string> = {};
    for (const fid of fileIds) {
      const [f] = await db.select({ id: schema.files.id, name: schema.files.name })
        .from(schema.files).where(eq(schema.files.id, fid));
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
  
  // PATCH /:id/read — 标记已读
  fastify.patch('/:id/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(schema.insights).set({ read: true })
      .where(and(eq(schema.insights.id, id), eq(schema.insights.userId, request.user!.id)));
    return reply.send({ success: true });
  });
  
  // GET /stats — 统计
  fastify.get('/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const [total] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.insights).where(eq(schema.insights.userId, userId));
    const [unread] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.insights).where(and(eq(schema.insights.userId, userId), eq(schema.insights.read, false)));
    return reply.send({
      total: Number(total?.count || 0),
      unread: Number(unread?.count || 0),
    });
  });
}
