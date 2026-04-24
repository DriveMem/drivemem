import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and, isNotNull, isNull, ilike, or, ne } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function agentActivityRoutes(fastify: FastifyInstance) {
  // GET / — paginated agent activity for dashboard
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string; offset?: string; source?: string };
    const limit = Math.min(parseInt(query.limit || '20', 10) || 20, 100);
    const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);
    const source = query.source; // 'agent' | 'user' | 'system' | undefined (all)

    // Source classification: agent = MCP API calls, user = web UI, system = automated
    const sourceFilter = source ? getSourceCondition(source) : undefined;

    const rows = await db.select({
      id: schema.apiActivityLogs.id,
      agentName: schema.apiActivityLogs.agentName,
      action: schema.apiActivityLogs.action,
      detail: schema.apiActivityLogs.detail,
      metadata: schema.apiActivityLogs.metadata,
      apiKeyId: schema.apiActivityLogs.apiKeyId,
      createdAt: schema.apiActivityLogs.createdAt,
      apiKeyName: schema.apiKeys.name,
    })
      .from(schema.apiActivityLogs)
      .leftJoin(schema.apiKeys, eq(schema.apiActivityLogs.apiKeyId, schema.apiKeys.id))
      .where(sourceFilter
        ? and(eq(schema.apiActivityLogs.userId, userId), sourceFilter)
        : eq(schema.apiActivityLogs.userId, userId))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.apiActivityLogs)
      .where(sourceFilter
        ? and(eq(schema.apiActivityLogs.userId, userId), sourceFilter)
        : eq(schema.apiActivityLogs.userId, userId));

    // Also return source counts for tab badges
    const sourceCounts = await db.select({
      hasAgent: sql<boolean>`bool_or(${schema.apiActivityLogs.apiKeyId} is not null)`,
      agentCount: sql<number>`count(*) filter (where ${schema.apiActivityLogs.apiKeyId} is not null)::int`,
      totalCount: sql<number>`count(*)::int`,
    })
      .from(schema.apiActivityLogs)
      .where(eq(schema.apiActivityLogs.userId, userId));

    const total = countRow?.count || 0;

    const activities = rows.map(r => {
      const agent = formatAgentName(r.agentName, r.apiKeyName);
      return {
        id: r.id,
        agentName: agent,
        action: r.action,
        summary: buildSummary(r.action, r.detail, r.metadata as Record<string, unknown> | null, agent),
        detail: r.detail?.slice(0, 200) || null,
        source: r.apiKeyId ? 'agent' : 'system',
        createdAt: r.createdAt,
      };
    });

    return reply.send({
      activities,
      total,
      limit,
      offset,
      sourceCounts: {
        all: sourceCounts[0]?.totalCount || 0,
        agent: sourceCounts[0]?.agentCount || 0,
      },
    });
  });
}

function getSourceCondition(source: string) {
  switch (source) {
    case 'agent':
      return isNotNull(schema.apiActivityLogs.apiKeyId);
    case 'system':
      return isNull(schema.apiActivityLogs.apiKeyId);
    default:
      return undefined;
  }
}

function formatAgentName(raw: string | null | undefined, apiKeyName?: string | null): string {
  // Priority 1: use the API key display name from agent config
  if (apiKeyName) return apiKeyName;

  // Priority 2: if raw name is missing or generic, show default
  if (!raw || raw === 'AI Agent' || raw === 'Unknown') {
    return 'AI Agent';
  }

  // Priority 3: mask internal "Agent10"-style names as "Unnamed Agent"
  if (/^Agent\d+$/i.test(raw)) {
    return 'Unnamed Agent';
  }

  // Priority 4: return raw name as-is (it's a meaningful name)
  return raw;
}

function buildSummary(action: string, detail: string | null, metadata: Record<string, unknown> | null, agent: string): string {
  const short = detail ? (detail.length > 60 ? detail.slice(0, 57) + '...' : detail) : null;
  switch (action) {
    case 'search': return short ? `Searched for "${short}"` : 'Performed a search';
    case 'store': return short ? `Saved "${short}"` : 'Saved a note';
    case 'ask': return short ? `Asked "${short}"` : 'Asked a question';
    case 'compile': return short ? `Compiled briefing for "${short}"` : 'Compiled a briefing';
    case 'auto_capture': return short ? `Auto-captured "${short}"` : 'Auto-captured knowledge';
    case 'capture': return short ? `Captured "${short}"` : 'Captured a conversation';
    case 'relay': {
      const fromAgent = metadata?.fromAgent ? formatAgentName(metadata.fromAgent as string) : 'another agent';
      const fileName = (metadata?.fileName as string) || short || 'a file';
      return `Used knowledge from ${fromAgent}: "${fileName}"`;
    }
    default: return short ? `${action}: ${short}` : action;
  }
}
