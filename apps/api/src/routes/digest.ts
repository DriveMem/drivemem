import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function digestRoutes(fastify: FastifyInstance) {
  // GET /weekly — weekly usage digest (session auth)
  fastify.get('/weekly', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    try {
      const [filesStats] = await db.select({
        total: sql<number>`count(*)::int`,
        recent: sql<number>`count(*) filter (where ${schema.files.createdAt} >= ${sevenDaysAgo})::int`,
      }).from(schema.files).where(eq(schema.files.userId, userId));

      const [convStats] = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(schema.conversations).where(and(
        eq(schema.conversations.userId, userId),
        gte(schema.conversations.createdAt, sevenDaysAgo),
      ));

      const [insightStats] = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(schema.insights).where(and(
        eq(schema.insights.userId, userId),
        sql`${schema.insights.createdAt} >= ${sevenDaysAgo}`,
      ));

      const [agentCallStats] = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(schema.messages)
        .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
        .where(and(
          eq(schema.conversations.userId, userId),
          gte(schema.messages.createdAt, sevenDaysAgo),
          eq(schema.messages.role, 'user'),
        ));

      const [storageStats] = await db.select({
        totalBytes: sql<number>`coalesce(sum(${schema.files.size}), 0)::bigint`,
      }).from(schema.files).where(eq(schema.files.userId, userId));

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
      };
    } catch (err) {
      request.log.error(err, 'digest/weekly failed');
      return { period: { from: sevenDaysAgo.toISOString(), to: now.toISOString() }, stats: {} };
    }
  });
}
