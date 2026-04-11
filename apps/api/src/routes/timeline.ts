import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and, isNull, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export interface TimelineEvent {
  id: string;
  type: 'file_uploaded' | 'conversation' | 'insight' | 'report';
  title: string;
  description?: string;
  icon: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
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
    ...files.map(f => ({
      id: f.id,
      type: 'file_uploaded' as const,
      title: f.name,
      description: f.summary?.slice(0, 100) || undefined,
      icon: '📄',
      createdAt: f.createdAt,
      metadata: { mimeType: f.mimeType, size: Number(f.size), status: f.status },
    })),
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
}
