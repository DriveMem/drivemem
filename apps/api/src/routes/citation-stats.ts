import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function citationStatsRoutes(fastify: FastifyInstance) {
  // GET /api/citations/top — top 5 most referenced files
  fastify.get('/top', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const results = await db.select({
      fileId: schema.citationEvents.fileId,
      count: sql<number>`count(*)::int`,
      lastCited: sql<string>`max(created_at)::text`,
    }).from(schema.citationEvents)
      .where(eq(schema.citationEvents.userId, userId))
      .groupBy(schema.citationEvents.fileId)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const fileIds = results.map(r => r.fileId);
    const files = fileIds.length
      ? await db.select({ id: schema.files.id, name: schema.files.name })
          .from(schema.files).where(inArray(schema.files.id, fileIds))
      : [];
    const nameMap = new Map(files.map(f => [f.id, f.name]));

    return reply.send({
      topReferenced: results.map(r => ({
        fileId: r.fileId,
        fileName: nameMap.get(r.fileId) || 'Unknown',
        citationCount: r.count,
        lastCitedAt: r.lastCited,
      }))
    });
  });
}
