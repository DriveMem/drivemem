import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function knowledgeGapRoutes(fastify: FastifyInstance) {
  // GET / — get user's undismissed knowledge gaps
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const gaps = await db.select()
      .from(schema.knowledgeGaps)
      .where(and(eq(schema.knowledgeGaps.userId, userId), eq(schema.knowledgeGaps.dismissed, false)))
      .orderBy(desc(schema.knowledgeGaps.createdAt))
      .limit(10);
    return reply.send({ gaps });
  });

  // POST /:id/dismiss — dismiss a gap
  fastify.post('/:id/dismiss', { preHandler: [requireAuth] }, async (request, reply) => {
    const id = parseInt((request.params as any).id);
    await db.update(schema.knowledgeGaps).set({ dismissed: true }).where(eq(schema.knowledgeGaps.id, id));
    return reply.send({ ok: true });
  });
}
