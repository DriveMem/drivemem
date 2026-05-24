/**
 * BM25-style full-text search using PostgreSQL tsvector + ts_rank_cd.
 */
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface BM25Result {
  id: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
  score: number;
}

/**
 * Convert a user query string into a tsquery.
 * Splits on whitespace and joins with '|' (OR) for broad recall.
 * Uses 'simple' config to avoid language-specific stemming issues with Chinese.
 */
function buildTsQuery(query: string): string {
  const tokens = query
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/'/g, "''"));

  if (tokens.length === 0) return '';
  // Use plainto_tsquery as fallback-safe, or build OR query
  return tokens.map((t) => `'${t}'`).join(' | ');
}

/**
 * Search chunks using PostgreSQL full-text search with ts_rank_cd scoring.
 * Combines file-level matches (name/summary weighted A) with chunk content (weighted D).
 */
export async function searchBM25(
  userId: string,
  query: string,
  limit: number = 30,
  workspaceId?: string,
): Promise<BM25Result[]> {
  const tsQueryStr = buildTsQuery(query);
  if (!tsQueryStr) return [];

  const workspaceFilter = workspaceId
    ? sql`AND sc.workspace_id = ${workspaceId}`
    : sql`AND sc.workspace_id IS NULL`;

  // Search in search_chunks table with file name boost
  const results = await db.execute(sql`
    WITH query AS (
      SELECT to_tsquery('simple', ${tsQueryStr}) AS q
    ),
    chunk_matches AS (
      SELECT
        sc.id,
        sc.file_id,
        sc.chunk_index,
        sc.content,
        f.name AS file_name,
        ts_rank_cd(
          setweight(coalesce(f.search_vector, ''::tsvector), 'A') ||
          setweight(coalesce(sc.search_vector, ''::tsvector), 'D'),
          query.q
        ) AS rank
      FROM search_chunks sc
      CROSS JOIN query
      JOIN files f ON f.id = sc.file_id
      WHERE sc.user_id = ${userId}
        ${workspaceFilter}
        AND (sc.search_vector @@ query.q OR f.search_vector @@ query.q)
      ORDER BY rank DESC
      LIMIT ${limit}
    )
    SELECT * FROM chunk_matches
  `);

  return (results as any[]).map((r) => ({
    id: r.id,
    fileId: r.file_id,
    fileName: r.file_name,
    chunkIndex: r.chunk_index ?? 0,
    text: (r.content ?? '').slice(0, 500),
    score: parseFloat(r.rank) || 0,
  }));
}
