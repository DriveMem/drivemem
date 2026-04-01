import { FastifyInstance } from 'fastify';
import { ilike, or, eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { searchSimilar } from '../services/vector.service.js';
import { embedTexts } from '../services/llm.service.js';

export default async function searchRoutes(app: FastifyInstance) {
  // GET / — full-text search
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { q } = request.query as { q?: string };

    if (!q || q.trim().length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Query parameter "q" is required', 400);
    }

    const query = q.trim();
    const userId = request.user!.id;
    const results: Array<{
      type: 'file' | 'chunk';
      fileId: string;
      fileName: string;
      chunkIndex?: number;
      text?: string;
      highlight?: string;
    }> = [];

    // 1. Search by file name (ILIKE)
    const pattern = `%${query}%`;
    const fileResults = await db
      .select({ id: files.id, name: files.name, originalName: files.originalName })
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          or(ilike(files.name, pattern), ilike(files.originalName, pattern)),
        ),
      )
      .limit(10);

    for (const f of fileResults) {
      results.push({
        type: 'file',
        fileId: f.id,
        fileName: f.originalName,
        highlight: f.originalName,
      });
    }

    // 2. Semantic search via Qdrant
    const remaining = 20 - results.length;
    if (remaining > 0) {
      const [queryEmbedding] = await embedTexts([query]);
      const chunkResults = await searchSimilar({
        userId,
        query: queryEmbedding,
        scopeType: 'all',
        limit: remaining,
      });

      const existingFileIds = new Set(results.map((r) => r.fileId));
      for (const c of chunkResults) {
        // Avoid duplicate file entries
        if (results.length >= 20) break;
        results.push({
          type: 'chunk',
          fileId: c.fileId,
          fileName: c.fileName,
          chunkIndex: c.chunkIndex,
          text: c.text.slice(0, 200),
        });
      }
    }

    return reply.send({ results });
  });
}
