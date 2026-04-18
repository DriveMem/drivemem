/**
 * Backfill BM25 sparse vectors for all existing points in Qdrant.
 *
 * Usage: npx tsx apps/api/src/scripts/backfill-bm25.ts
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { tokenizeBM25 } from '../services/bm25-tokenizer.js';

const COLLECTION_NAME = 'document_chunks';
const BATCH_SIZE = 100;

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || undefined;

const qdrant = new QdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey });

async function backfill() {
  console.log('[backfill-bm25] Starting...');

  // First ensure the sparse vector config exists
  try {
    await fetch(`${qdrantUrl}/collections/${COLLECTION_NAME}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(qdrantApiKey ? { 'api-key': qdrantApiKey } : {}),
      },
      body: JSON.stringify({ sparse_vectors: { bm25: {} } }),
    });
    console.log('[backfill-bm25] Ensured bm25 sparse vector config');
  } catch (e) {
    console.log('[backfill-bm25] Sparse vector config may already exist');
  }

  let offset: string | number | undefined = undefined;
  let totalProcessed = 0;

  while (true) {
    const result = await qdrant.scroll(COLLECTION_NAME, {
      limit: BATCH_SIZE,
      offset,
      with_payload: true,
      with_vector: false,
    });

    const points = result.points;
    if (points.length === 0) break;

    const upsertPoints = points.map((p) => {
      const text = (p.payload as Record<string, unknown>)?.text as string ?? '';
      const sparse = tokenizeBM25(text);
      return {
        id: p.id,
        vector: {
          bm25: sparse,
        },
      };
    });

    await qdrant.upsert(COLLECTION_NAME, {
      points: upsertPoints,
    });

    totalProcessed += points.length;
    console.log(`[backfill-bm25] Processed ${totalProcessed} points`);

    offset = result.next_page_offset as string | number | undefined;
    if (!offset) break;
  }

  console.log(`[backfill-bm25] Done. Total: ${totalProcessed} points`);
}

backfill().catch((err) => {
  console.error('[backfill-bm25] Error:', err);
  process.exit(1);
});
