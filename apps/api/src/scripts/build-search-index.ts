/**
 * Build search index: populate search_chunks table and tsvector columns.
 *
 * Usage: npx tsx apps/api/src/scripts/build-search-index.ts
 *
 * This script:
 * 1. Reads all chunks from Qdrant (via vector service scroll)
 * 2. Inserts them into the search_chunks PG table
 * 3. The PG trigger auto-generates the tsvector
 * 4. Updates files.search_vector for all files
 */
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { config } from '../lib/config.js';

const QDRANT_URL = config.QDRANT_URL;
const QDRANT_API_KEY = config.QDRANT_API_KEY;
const COLLECTION = 'document_chunks';
const BATCH_SIZE = 100;

async function qdrantScroll(offset?: string): Promise<{ points: any[]; next_page_offset: string | null }> {
  const body: any = { limit: BATCH_SIZE, with_payload: true };
  if (offset) body.offset = offset;

  const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/scroll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(QDRANT_API_KEY ? { 'api-key': QDRANT_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Qdrant scroll failed: ${res.status}`);
  const data = await res.json();
  return { points: data.result.points, next_page_offset: data.result.next_page_offset };
}

async function main() {
  console.log('[build-search-index] Starting...');

  // Step 1: Clear existing search_chunks
  await db.execute(sql`TRUNCATE search_chunks`);
  console.log('[build-search-index] Cleared search_chunks table');

  // Step 2: Scroll through all Qdrant points and insert into search_chunks
  let offset: string | undefined;
  let totalInserted = 0;

  while (true) {
    const { points, next_page_offset } = await qdrantScroll(offset);
    if (points.length === 0) break;

    // Batch insert into search_chunks
    const values = points.map((p: any) => ({
      userId: p.payload.user_id,
      fileId: p.payload.file_id,
      chunkIndex: p.payload.chunk_index ?? 0,
      content: p.payload.text ?? '',
    }));

    for (const v of values) {
      await db.execute(sql`
        INSERT INTO search_chunks (user_id, file_id, chunk_index, content)
        VALUES (${v.userId}, ${v.fileId}, ${v.chunkIndex}, ${v.content})
      `);
    }

    totalInserted += points.length;
    console.log(`[build-search-index] Inserted ${totalInserted} chunks...`);

    if (!next_page_offset) break;
    offset = next_page_offset;
  }

  // Step 3: Update files.search_vector for all existing files
  await db.execute(sql`
    UPDATE files SET search_vector =
      setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(original_name, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(summary, '')), 'D')
  `);
  console.log('[build-search-index] Updated files.search_vector');

  const [countResult] = await db.execute(sql`SELECT count(*) as cnt FROM search_chunks`) as any[];
  console.log(`[build-search-index] Done! Total search_chunks: ${countResult.cnt}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[build-search-index] Error:', err);
  process.exit(1);
});
