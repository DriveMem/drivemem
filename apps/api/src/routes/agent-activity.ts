import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function agentActivityRoutes(fastify: FastifyInstance) {
  // GET / — paginated agent activity for dashboard
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20', 10) || 20, 100);
    const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);

    const rows = await db.select({
      id: schema.apiActivityLogs.id,
      agentName: schema.apiActivityLogs.agentName,
      action: schema.apiActivityLogs.action,
      detail: schema.apiActivityLogs.detail,
      metadata: schema.apiActivityLogs.metadata,
      createdAt: schema.apiActivityLogs.createdAt,
    })
      .from(schema.apiActivityLogs)
      .where(eq(schema.apiActivityLogs.userId, userId))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.apiActivityLogs)
      .where(eq(schema.apiActivityLogs.userId, userId));

    const total = countRow?.count || 0;

    const activities = rows.map(r => {
      const agent = formatAgentName(r.agentName);
      return {
        id: r.id,
        agentName: agent,
        action: r.action,
        summary: buildSummary(r.action, r.detail, r.metadata as Record<string, unknown> | null, agent),
        detail: r.detail?.slice(0, 200) || null,
        createdAt: r.createdAt,
      };
    });

    return reply.send({ activities, total, limit, offset });
  });
}

function formatAgentName(raw: string | null | undefined): string {
  if (!raw) return 'AI Agent';
  const cleaned = raw
    .replace(/^agent[-_]?[a-z][-_]?/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
  if (!cleaned) return 'AI Agent';
  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
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
