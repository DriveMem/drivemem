import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { sql } from 'drizzle-orm';

export default async function adminRoutes(fastify: FastifyInstance) {
  // GET /stats — 运营统计（admin token 认证）
  fastify.get('/stats', async (request, reply) => {
    const adminToken = process.env.ADMIN_TOKEN;
    const auth = request.headers.authorization?.replace('Bearer ', '');
    if (!adminToken || auth !== adminToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
    const [activeToday] = await db.select({ count: sql<number>`count(DISTINCT user_id)` })
      .from(schema.conversations)
      .where(sql`created_at > ${todayISO} OR updated_at > ${todayISO}`);
    const [totalFiles] = await db.select({ count: sql<number>`count(*)` }).from(schema.files);
    const [filesToday] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.files)
      .where(sql`created_at > ${todayISO}`);
    const [totalConvs] = await db.select({ count: sql<number>`count(*)` }).from(schema.conversations);
    const [convsToday] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.conversations)
      .where(sql`created_at > ${todayISO}`);
    const [totalFeedback] = await db.select({ count: sql<number>`count(*)` }).from(schema.feedback);

    return reply.send({
      totalUsers: Number(totalUsers?.count || 0),
      activeUsersToday: Number(activeToday?.count || 0),
      totalFiles: Number(totalFiles?.count || 0),
      filesUploadedToday: Number(filesToday?.count || 0),
      totalConversations: Number(totalConvs?.count || 0),
      conversationsToday: Number(convsToday?.count || 0),
      totalFeedback: Number(totalFeedback?.count || 0),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /public-stats — 公开统计（官网用，无需认证）
  fastify.get('/public-stats', async (_request, reply) => {
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
    const [totalFiles] = await db.select({ count: sql<number>`count(*)` }).from(schema.files);
    const [totalConversations] = await db.select({ count: sql<number>`count(*)` }).from(schema.conversations);
    return reply.send({
      users: Number(totalUsers?.count || 0),
      files: Number(totalFiles?.count || 0),
      conversations: Number(totalConversations?.count || 0),
    });
  });
}
