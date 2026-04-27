import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, gt, sql } from 'drizzle-orm';

export async function recordKnowledgeGap(params: {
  userId: string;
  query: string;
  source: 'search' | 'mcp_search' | 'ask' | 'chat';
  resultCount: number;
}): Promise<void> {
  try {
    // Only record if results are 0 or very low (≤2)
    if (params.resultCount > 2) return;

    // Skip very short queries (likely not meaningful)
    if (params.query.trim().length < 3) return;

    // Dedup: don't record same query twice within 24h
    const existing = await db.select().from(schema.knowledgeGaps)
      .where(and(
        eq(schema.knowledgeGaps.userId, params.userId),
        eq(schema.knowledgeGaps.query, params.query),
        gt(schema.knowledgeGaps.createdAt, sql`now() - interval '24 hours'`)
      )).limit(1);
    if (existing.length > 0) return;

    await db.insert(schema.knowledgeGaps).values({
      userId: params.userId,
      query: params.query,
      source: params.source,
      resultCount: params.resultCount,
    });
  } catch (err) {
    // Fire-and-forget: don't break search flow
    console.error('[knowledge-gap-tracker] Error recording gap:', err);
  }
}
