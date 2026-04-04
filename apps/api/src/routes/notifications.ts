import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function notificationRoutes(fastify: FastifyInstance) {
  // GET / — 获取通知列表
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const notifications = await db.select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);
    return reply.send({ notifications });
  });

  // GET /unread-count — 未读数
  fastify.get('/unread-count', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.read, false)));
    return reply.send({ count: Number(result?.count || 0) });
  });

  // PATCH /:id/read — 标记已读
  fastify.patch('/:id/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    await db.update(schema.notifications)
      .set({ read: true })
      .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, userId)));
    return reply.send({ success: true });
  });

  // POST /read-all — 全部标记已读
  fastify.post('/read-all', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    await db.update(schema.notifications)
      .set({ read: true })
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.read, false)));
    return reply.send({ success: true });
  });
}
