import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, eq, or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar, preprocessQuery } from '../services/vector.service.js';
import { searchBM25 } from '../services/bm25.service.js';
import { fuseResults, type RRFInput } from '../services/rrf.service.js';

const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  mode: z.enum(['hybrid', 'semantic', 'keyword']).default('hybrid'),
  workspace_id: z.string().uuid().optional(),
});

export default async function searchRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const { q, limit, offset, mode, workspace_id } = searchQuerySchema.parse(request.query);
    const user = request.user!;

    const K1 = 30; // BM25 candidate count
    const K2 = 30; // Vector candidate count

    // Execute search based on mode
    let allResults: Array<{
      type: 'file' | 'chunk';
      fileId: string;
      fileName: string;
      chunkIndex?: number;
      text?: string;
      highlight?: string;
      score?: number;
      rrfScore?: number;
      sources?: Array<'bm25' | 'vector'>;
    }>;

    if (mode === 'keyword') {
      // BM25 only
      const bm25Results = await searchBM25(user.id, q, limit + offset, workspace_id);
      allResults = bm25Results.map((r) => ({
        type: 'chunk' as const,
        fileId: r.fileId,
        fileName: r.fileName,
        chunkIndex: r.chunkIndex,
        text: r.text,
        score: r.score,
      }));
    } else if (mode === 'semantic') {
      // Vector only (existing logic)
      const processedQuery = preprocessQuery(q);
      const [queryVector] = await embedTexts([processedQuery]);
      const chunkResults = await searchSimilar({
        userId: user.id,
        query: queryVector,
        queryText: processedQuery,
        scopeType: 'all',
        limit: limit + offset,
      });

      // Also search file names
      const fileResults = await db.select().from(files)
        .where(and(
          eq(files.userId, user.id),
          or(ilike(files.name, `%${q}%`), ilike(files.originalName, `%${q}%`))
        ))
        .limit(limit + offset + 10);

      allResults = [
        ...fileResults.map((f) => ({
          type: 'file' as const,
          fileId: f.id,
          fileName: f.name,
          highlight: f.name,
        })),
        ...chunkResults.map((c) => ({
          type: 'chunk' as const,
          fileId: c.fileId,
          fileName: c.fileName,
          chunkIndex: c.chunkIndex,
          text: c.text.slice(0, 200),
          score: c.score,
        })),
      ];
    } else {
      // Hybrid: parallel BM25 + vector, then RRF fusion
      const processedQuery = preprocessQuery(q);
      const [queryVector] = await embedTexts([processedQuery]);

      const [bm25Results, vectorResults] = await Promise.all([
        searchBM25(user.id, q, K1, workspace_id),
        searchSimilar({
          userId: user.id,
          query: queryVector,
          queryText: processedQuery,
          scopeType: 'all',
          limit: K2,
        }),
      ]);

      // Convert to RRFInput format
      const bm25Inputs: RRFInput[] = bm25Results.map((r) => ({
        id: r.id,
        fileId: r.fileId,
        fileName: r.fileName,
        chunkIndex: r.chunkIndex,
        text: r.text,
        score: r.score,
      }));

      const vectorInputs: RRFInput[] = vectorResults.map((r) => ({
        id: `${r.fileId}:${r.chunkIndex}`,
        fileId: r.fileId,
        fileName: r.fileName,
        chunkIndex: r.chunkIndex,
        text: r.text.slice(0, 500),
        score: r.score,
      }));

      const fused = fuseResults(bm25Inputs, vectorInputs);

      allResults = fused.map((r) => ({
        type: 'chunk' as const,
        fileId: r.fileId,
        fileName: r.fileName,
        chunkIndex: r.chunkIndex,
        text: r.text,
        score: r.rrfScore,
        rrfScore: r.rrfScore,
        sources: r.sources,
      }));
    }

    const total = allResults.length;
    const results = allResults.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return { results, total, hasMore };
  });
}
