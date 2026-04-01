import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, eq, or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { embedTexts } from '../services/llm.service.js';
import { searchSimilar } from '../services/vector.service.js';

const searchQuerySchema = z.object({ q: z.string().min(1) });

export default async function searchRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const { q } = searchQuerySchema.parse(request.query);
    const user = request.user!;

    // 1. 搜文件名 (PG ILIKE)
    const fileResults = await db.select().from(files)
      .where(and(
        eq(files.userId, user.id),
        or(ilike(files.name, `%${q}%`), ilike(files.originalName, `%${q}%`))
      ))
      .limit(10);

    // 2. 搜内容 (Qdrant 向量搜索)
    const [queryVector] = await embedTexts([q]);
    const chunkResults = await searchSimilar({
      userId: user.id,
      query: queryVector,
      scopeType: 'all',
      limit: 10,
    });

    // 合并结果
    const results = [
      ...fileResults.map(f => ({
        type: 'file' as const,
        fileId: f.id,
        fileName: f.name,
        highlight: f.name,
      })),
      ...chunkResults.map(c => ({
        type: 'chunk' as const,
        fileId: c.fileId,
        fileName: c.fileName,
        chunkIndex: c.chunkIndex,
        text: c.text.slice(0, 200),
        score: c.score,
      })),
    ].slice(0, 20);

    return { results };
  });
}
