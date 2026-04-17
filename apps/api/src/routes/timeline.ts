import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and, isNull, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export interface TimelineEvent {
  id: string;
  type: 'file_uploaded' | 'conversation' | 'insight' | 'report' | 'agent_activity' | 'auto_capture';
  title: string;
  description?: string;
  icon: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

function formatAgentName(raw: string | null | undefined): string {
  if (!raw) return 'You';
  const cleaned = raw
    .replace(/^agent[-_]?[a-z][-_]?/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
  if (!cleaned) return 'AI Agent';
  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}

function getFullDetail(detail: string | null | undefined, metadata: Record<string, unknown> | null | undefined): string | undefined {
  if (!detail) return undefined;
  if (detail.endsWith('...') && metadata) {
    const fuller = (metadata as any).query || (metadata as any).detail || (metadata as any).content || (metadata as any).question;
    if (fuller && typeof fuller === 'string' && fuller.length > detail.length) {
      return fuller.slice(0, 200);
    }
  }
  return detail.slice(0, 200);
}

export async function fetchTimeline(userId: string, limit: number, cursor?: string) {
  // cursor is an ISO timestamp string; fetch items older than cursor
  const cursorDate = cursor ? new Date(cursor) : undefined;

  // Fetch limit+1 from each table to allow merged cursor pagination
  const fetchLimit = limit + 1;

  const filesQuery = db.select({
    id: schema.files.id,
    name: schema.files.name,
    mimeType: schema.files.mimeType,
    size: schema.files.size,
    summary: schema.files.summary,
    status: schema.files.status,
    createdAt: schema.files.createdAt,
  })
    .from(schema.files)
    .where(cursorDate
      ? and(eq(schema.files.userId, userId), isNull(schema.files.archivedAt), sql`${schema.files.createdAt} < ${cursorDate.toISOString()}`)
      : and(eq(schema.files.userId, userId), isNull(schema.files.archivedAt)))
    .orderBy(desc(schema.files.createdAt))
    .limit(fetchLimit);

  const conversationsQuery = db.select({
    id: schema.conversations.id,
    title: schema.conversations.title,
    createdAt: schema.conversations.createdAt,
    updatedAt: schema.conversations.updatedAt,
  })
    .from(schema.conversations)
    .where(cursorDate
      ? and(eq(schema.conversations.userId, userId), sql`COALESCE(${schema.conversations.updatedAt}, ${schema.conversations.createdAt}) < ${cursorDate.toISOString()}`)
      : eq(schema.conversations.userId, userId))
    .orderBy(desc(schema.conversations.updatedAt))
    .limit(fetchLimit);

  const insightsQuery = db.select({
    id: schema.insights.id,
    title: schema.insights.title,
    description: schema.insights.description,
    type: schema.insights.type,
    sourceFileId: schema.insights.sourceFileId,
    relatedFileId: schema.insights.relatedFileId,
    createdAt: schema.insights.createdAt,
  })
    .from(schema.insights)
    .where(cursorDate
      ? and(eq(schema.insights.userId, userId), sql`${schema.insights.createdAt} < ${cursorDate.toISOString()}`)
      : eq(schema.insights.userId, userId))
    .orderBy(desc(schema.insights.createdAt))
    .limit(fetchLimit);

  const reportsQuery = db.select({
    id: schema.reports.id,
    content: schema.reports.content,
    createdAt: schema.reports.createdAt,
  })
    .from(schema.reports)
    .where(cursorDate
      ? and(eq(schema.reports.userId, userId), sql`${schema.reports.createdAt} < ${cursorDate.toISOString()}`)
      : eq(schema.reports.userId, userId))
    .orderBy(desc(schema.reports.createdAt))
    .limit(fetchLimit);

  const [files, conversations, insights, reports] = await Promise.all([
    filesQuery, conversationsQuery, insightsQuery, reportsQuery,
  ]);

  // Fetch agent activity logs
  const activitiesQuery = db.select({
    id: schema.apiActivityLogs.id,
    agentName: schema.apiActivityLogs.agentName,
    action: schema.apiActivityLogs.action,
    detail: schema.apiActivityLogs.detail,
    metadata: schema.apiActivityLogs.metadata,
    createdAt: schema.apiActivityLogs.createdAt,
  }).from(schema.apiActivityLogs)
    .where(cursorDate
      ? and(eq(schema.apiActivityLogs.userId, userId), sql`${schema.apiActivityLogs.createdAt} < ${cursorDate.toISOString()}`)
      : eq(schema.apiActivityLogs.userId, userId))
    .orderBy(desc(schema.apiActivityLogs.createdAt))
    .limit(fetchLimit);

  const activities = await activitiesQuery;

  // Batch-fetch file names for insights
  const insightFileIds = [...new Set(insights.flatMap(i => [i.sourceFileId, i.relatedFileId]).filter(Boolean))];
  const fileNames: Record<string, string> = {};
  if (insightFileIds.length > 0) {
    const fileRows = await db.select({ id: schema.files.id, name: schema.files.name })
      .from(schema.files)
      .where(inArray(schema.files.id, insightFileIds));
    for (const f of fileRows) fileNames[f.id] = f.name;
  }

  const events: TimelineEvent[] = [
    ...files.map(f => {
      const isAutoCapture = f.name.startsWith('auto-capture-');
      // For auto-capture notes, use summary as title if available, otherwise clean the filename
      const displayTitle = isAutoCapture
        ? (f.summary?.slice(0, 80) || f.name.replace(/^auto-capture-/, '').replace(/\.\w+$/, '').replace(/[-_]/g, ' '))
        : f.name;
      return {
      id: f.id,
      type: (isAutoCapture ? 'auto_capture' : 'file_uploaded') as 'auto_capture' | 'file_uploaded',
      title: displayTitle,
      description: isAutoCapture ? undefined : (f.summary?.slice(0, 100) || undefined),
      icon: isAutoCapture ? '🧲' : '📄',
      createdAt: f.createdAt,
      metadata: { mimeType: f.mimeType, size: Number(f.size), status: f.status },
    };}),
    ...conversations.map(c => ({
      id: c.id,
      type: 'conversation' as const,
      title: c.title || '新对话',
      icon: '💬',
      createdAt: c.updatedAt || c.createdAt,
      metadata: {},
    })),
    ...insights.map(i => ({
      id: i.id,
      type: 'insight' as const,
      title: i.title,
      description: i.description?.slice(0, 100) || undefined,
      icon: '💡',
      createdAt: i.createdAt,
      metadata: {
        insightType: i.type,
        sourceFileId: i.sourceFileId,
        relatedFileId: i.relatedFileId,
        sourceFileName: fileNames[i.sourceFileId] || undefined,
        relatedFileName: fileNames[i.relatedFileId] || undefined,
      },
    })),
    ...reports.map(r => ({
      id: r.id,
      type: 'report' as const,
      title: '分析报告',
      description: r.content.slice(0, 100),
      icon: '📊',
      createdAt: r.createdAt,
      metadata: {},
    })),
    ...activities.map(a => {
      const iconMap: Record<string, string> = { search: '🔍', store: '📥', ask: '💬', compile: '📋' };
      const icon = iconMap[a.action] || '🤖';
      const agent = formatAgentName(a.agentName) || 'API';
      const fullDetail = getFullDetail(a.detail, a.metadata as Record<string, unknown>);
      const shortDetail = fullDetail ? (fullDetail.length > 60 ? fullDetail.slice(0, 57) + '...' : fullDetail) : null;

      // Build complete title with action context
      let title: string;
      switch (a.action) {
        case 'search':
          title = shortDetail ? `${agent} searched for "${shortDetail}"` : `${agent} performed a search`;
          break;
        case 'store':
          title = shortDetail ? `${agent} saved "${shortDetail}"` : `${agent} saved a note`;
          break;
        case 'ask':
          title = shortDetail ? `${agent} asked "${shortDetail}"` : `${agent} asked a question`;
          break;
        case 'compile':
          title = shortDetail ? `${agent} compiled briefing for "${shortDetail}"` : `${agent} compiled a briefing`;
          break;
        default:
          title = shortDetail ? `${agent} ${a.action}: ${shortDetail}` : `${agent} ${a.action}`;
      }

      return {
        id: a.id,
        type: 'agent_activity' as const,
        title,
        description: fullDetail && fullDetail.length > 60 ? fullDetail : undefined,
        icon,
        createdAt: a.createdAt,
        metadata: { action: a.action, agentName: a.agentName, ...(a.metadata as Record<string, unknown> || {}) },
      };
    }),
  ];

  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Take limit items; if we have more than limit, there are more pages
  const hasMore = events.length > limit;
  const paginated = events.slice(0, limit);
  const nextCursor = hasMore && paginated.length > 0
    ? new Date(paginated[paginated.length - 1].createdAt).toISOString()
    : null;

  return { events: paginated, hasMore, nextCursor };
}

export default async function timelineRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string; cursor?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const cursor = query.cursor || undefined;

    const result = await fetchTimeline(userId, limit, cursor);
    return reply.send(result);
  });

  // GET /activity-flow — activities grouped by agent with flow detection
  fastify.get('/activity-flow', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 200);
    
    const activities = await db.select()
      .from(schema.apiActivityLogs)
      .where(eq(schema.apiActivityLogs.userId, userId))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(limit);

    const agentGroups: Record<string, any[]> = {};
    for (const a of activities) {
      const agent = formatAgentName(a.agentName);
      if (!agentGroups[agent]) agentGroups[agent] = [];
      agentGroups[agent].push({
        id: a.id, action: a.action, detail: getFullDetail(a.detail, a.metadata as Record<string, unknown>),
        createdAt: a.createdAt, relatedFileIds: a.relatedFileIds, metadata: a.metadata,
      });
    }

    const flows: Array<{ from: string; to: string; fileNames: string[]; timestamp: string }> = [];
    const fileAgentMap: Record<string, string> = {};
    for (const a of activities) {
      if (a.action === 'store' && a.metadata) {
        const fileId = (a.metadata as any).fileId;
        if (fileId) fileAgentMap[fileId] = formatAgentName(a.agentName);
      }
    }
    for (const a of activities) {
      if ((a.action === 'search' || a.action === 'compile') && a.relatedFileIds) {
        for (const fid of (a.relatedFileIds as string[])) {
          const sourceAgent = fileAgentMap[fid];
          if (sourceAgent && sourceAgent !== (a.agentName || 'You')) {
            flows.push({ from: sourceAgent, to: formatAgentName(a.agentName), fileNames: [], timestamp: a.createdAt?.toISOString() || '' });
          }
        }
      }
    }

    return reply.send({ agents: agentGroups, flows, totalActivities: activities.length });
  });

  // POST /compile — session-auth wrapper for web UI
  fastify.post('/compile', { preHandler: [requireAuth] }, async (request, reply) => {
    const { compileContext } = await import('../services/context-compiler/index.js');
    const userId = request.user!.id;
    const body = request.body as any;
    if (!body?.task) return reply.status(400).send({ error: 'task is required' });
    const result = await compileContext(userId, {
      task: body.task,
      model: body.model,
      tokenBudget: body.tokenBudget,
      hints: body.hints,
      format: body.format,
    });
    return reply.send(result);
  });
}
