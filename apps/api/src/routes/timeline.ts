import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and, isNull, inArray } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

interface TimelineEvent {
  id: string;
  type: 'file_upload' | 'conversation' | 'insight' | 'report';
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export default async function timelineRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const [files, conversations, insights, reports] = await Promise.all([
      db.select({
        id: schema.files.id,
        name: schema.files.name,
        mimeType: schema.files.mimeType,
        size: schema.files.size,
        summary: schema.files.summary,
        status: schema.files.status,
        createdAt: schema.files.createdAt,
      })
        .from(schema.files)
        .where(and(eq(schema.files.userId, userId), isNull(schema.files.archivedAt)))
        .orderBy(desc(schema.files.createdAt)),

      db.select({
        id: schema.conversations.id,
        title: schema.conversations.title,
        createdAt: schema.conversations.createdAt,
      })
        .from(schema.conversations)
        .where(eq(schema.conversations.userId, userId))
        .orderBy(desc(schema.conversations.createdAt)),

      db.select({
        id: schema.insights.id,
        title: schema.insights.title,
        description: schema.insights.description,
        sourceFileId: schema.insights.sourceFileId,
        relatedFileId: schema.insights.relatedFileId,
        createdAt: schema.insights.createdAt,
      })
        .from(schema.insights)
        .where(eq(schema.insights.userId, userId))
        .orderBy(desc(schema.insights.createdAt)),

      db.select({
        id: schema.reports.id,
        content: schema.reports.content,
        createdAt: schema.reports.createdAt,
      })
        .from(schema.reports)
        .where(eq(schema.reports.userId, userId))
        .orderBy(desc(schema.reports.createdAt)),
    ]);

    // Get file names for insights in batch
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
        type: 'file_upload' as const,
        title: f.name,
        subtitle: f.summary?.slice(0, 80) || undefined,
        metadata: { mimeType: f.mimeType, size: Number(f.size), status: f.status },
        createdAt: f.createdAt,
      })),
      ...conversations.map(c => ({
        id: c.id,
        type: 'conversation' as const,
        title: c.title || '新对话',
        createdAt: c.createdAt,
      })),
      ...insights.map(i => ({
        id: i.id,
        type: 'insight' as const,
        title: i.title,
        subtitle: i.description?.slice(0, 80) || undefined,
        metadata: {
          sourceFileName: fileNames[i.sourceFileId] || undefined,
          relatedFileName: fileNames[i.relatedFileId] || undefined,
        },
        createdAt: i.createdAt,
      })),
      ...reports.map(r => ({
        id: r.id,
        type: 'report' as const,
        title: r.content?.slice(0, 50) || 'AI 报告',
        createdAt: r.createdAt,
      })),
    ];

    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const paginated = events.slice(offset, offset + limit);

    return reply.send({
      events: paginated,
      total: events.length,
      hasMore: offset + limit < events.length,
    });
  });
}
