import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql, notInArray } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

const DEFAULT_PREFERENCES = {
  fileUpdates: true,
  aiAnalysis: true,
  storageWarning: true,
  systemAnnouncements: true,
  agentOperations: false, // UX #240 F2: silent by default, for future Settings UI
};

const preferencesSchema = z.object({
  fileUpdates: z.boolean(),
  aiAnalysis: z.boolean(),
  storageWarning: z.boolean(),
  systemAnnouncements: z.boolean(),
  agentOperations: z.boolean().optional(),
});

export default async function notificationRoutes(fastify: FastifyInstance) {
  // System noise types — hidden from bell, don't count toward badge
  const NOISE_TYPES = ['file_indexed', 'summary_generated', 'file_updated', 'chunk_indexed'];

  // GET /preferences — 获取通知偏好
  fastify.get('/preferences', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const [user] = await db.select({ notificationPreferences: schema.users.notificationPreferences })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    const prefs = (user?.notificationPreferences as any) || DEFAULT_PREFERENCES;
    return reply.send({ preferences: { ...DEFAULT_PREFERENCES, ...prefs } });
  });

  // PUT /preferences — 更新通知偏好
  fastify.put('/preferences', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const prefs = preferencesSchema.parse(request.body);
    await db.update(schema.users)
      .set({ notificationPreferences: prefs, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
    return reply.send({ preferences: prefs });
  });

  // GET / — 获取通知列表
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const notifications = await db.select()
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), notInArray(schema.notifications.type, NOISE_TYPES)))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);
    return reply.send({ notifications });
  });

  // GET /unread-count — 未读数
  fastify.get('/unread-count', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.read, false), notInArray(schema.notifications.type, NOISE_TYPES)));
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
