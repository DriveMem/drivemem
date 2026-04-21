import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function resumeBriefRoutes(fastify: FastifyInstance) {
  // GET / — Resume Brief: summary of activity since last login
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    // Get last active time from user record or default to 24h ago
    const [user] = await db.select({ lastActiveAt: schema.users.lastActiveAt })
      .from(schema.users).where(eq(schema.users.id, userId));

    const since = user?.lastActiveAt || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count new files since last active
    const [newFiles] = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), gte(schema.files.createdAt, since)));

    // Count new insights since last active
    const [newInsights] = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.insights)
      .where(and(eq(schema.insights.userId, userId), gte(schema.insights.createdAt, since)));

    // Count agent/MCP activity since last active
    const [agentActivity] = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.apiActivityLogs)
      .where(and(eq(schema.apiActivityLogs.userId, userId), gte(schema.apiActivityLogs.createdAt, since)));

    // Get recent agent activity details (top 5)
    const recentActivity = await db.select({
      agentName: schema.apiActivityLogs.agentName,
      action: schema.apiActivityLogs.action,
      detail: schema.apiActivityLogs.detail,
      createdAt: schema.apiActivityLogs.createdAt,
    })
      .from(schema.apiActivityLogs)
      .where(and(eq(schema.apiActivityLogs.userId, userId), gte(schema.apiActivityLogs.createdAt, since)))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(5);

    // Update lastActiveAt
    await db.update(schema.users).set({ lastActiveAt: new Date() }).where(eq(schema.users.id, userId));

    const hoursSinceActive = Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60));
    const newFilesCount = newFiles?.count || 0;
    const newInsightsCount = newInsights?.count || 0;
    const agentActivityCount = agentActivity?.count || 0;
    const total = newFilesCount + newInsightsCount + agentActivityCount;

    return reply.send({
      show: hoursSinceActive >= 4 && total > 0,
      since: since instanceof Date ? since.toISOString() : new Date(since).toISOString(),
      hoursSinceActive,
      newFilesCount,
      newInsightsCount,
      agentActivityCount,
      changes: { total, newFilesCount, newInsightsCount, agentActivityCount },
      recentActivity: recentActivity.map(a => ({
        agentName: a.agentName || 'You',
        action: a.action,
        detail: a.detail,
        createdAt: a.createdAt,
      })),
    });
  });

  // POST /dismiss — Dismiss the card by updating lastActiveAt
  fastify.post('/dismiss', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    await db.update(schema.users).set({ lastActiveAt: new Date() }).where(eq(schema.users.id, userId));
    return reply.send({ ok: true });
  });
}
