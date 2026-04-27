import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { requireAuth } from '../plugins/auth.js';

export default async function proxyAnalyticsRoutes(fastify: FastifyInstance) {
  // POST /api/proxy/event — ingest proxy call data (from client-side proxy)
  fastify.post('/event', { preHandler: [requireApiKey] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as {
      modelName: string;
      provider: string;
      contextTokens?: number;
      totalTokens?: number;
      responseTimeMs?: number;
      injectedContext?: boolean;
      success?: boolean;
    };

    if (!body.modelName || !body.provider) {
      return reply.status(400).send({ error: 'modelName and provider required' });
    }

    await db.insert(schema.proxyCallEvents).values({
      userId,
      modelName: body.modelName,
      provider: body.provider,
      contextTokens: body.contextTokens,
      totalTokens: body.totalTokens,
      responseTimeMs: body.responseTimeMs,
      injectedContext: body.injectedContext ?? false,
      success: body.success ?? true,
    });

    return reply.send({ ok: true });
  });

  // GET /api/proxy/stats — proxy analytics for Settings page
  fastify.get('/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const stats = await db.select({
      totalCalls: sql<number>`count(*)::int`,
      avgResponseMs: sql<number>`avg(response_time_ms)::int`,
      injectedCount: sql<number>`count(*) filter (where injected_context = true)::int`,
    }).from(schema.proxyCallEvents).where(eq(schema.proxyCallEvents.userId, userId));

    const topModels = await db.select({
      modelName: schema.proxyCallEvents.modelName,
      count: sql<number>`count(*)::int`,
    }).from(schema.proxyCallEvents)
      .where(eq(schema.proxyCallEvents.userId, userId))
      .groupBy(schema.proxyCallEvents.modelName)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    return reply.send({
      totalCalls: stats[0]?.totalCalls || 0,
      avgResponseMs: stats[0]?.avgResponseMs || 0,
      contextInjectionRate: stats[0]?.totalCalls ? Math.round((stats[0].injectedCount / stats[0].totalCalls) * 100) : 0,
      topModels: topModels.map(m => ({ name: m.modelName, calls: m.count })),
    });
  });
}
