import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { detectStaleContent } from '../services/stale-detector.js';

export default async function staleContentRoutes(fastify: FastifyInstance) {
  // GET /api/v1/stale-content — return stale files for user
  fastify.get('/stale-content', { preHandler: [requireApiKey] }, async (request, reply) => {
    const userId = request.user!.id;
    const staleFiles = await detectStaleContent(userId);
    return reply.send({ staleFiles, count: staleFiles.length });
  });

  // POST /api/v1/stale-content/:fileId/dismiss — reset staleScore
  fastify.post('/stale-content/:fileId/dismiss', { preHandler: [requireApiKey] }, async (request, reply) => {
    const userId = request.user!.id;
    const { fileId } = request.params as { fileId: string };

    const [file] = await db.select({ id: files.id })
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)));

    if (!file) return reply.status(404).send({ error: 'File not found' });

    await db.update(files)
      .set({ staleScore: 0, lastAccessedAt: new Date() })
      .where(eq(files.id, fileId));

    return reply.send({ success: true, message: 'Stale score reset' });
  });
}
