/**
 * BM25 Sparse Vector Backfill Script
 *
 * Reads all points from Qdrant that don't have BM25 sparse vectors,
 * generates sparse vectors from their text, and writes them back.
 *
 * Usage: npx tsx scripts/backfill-bm25.ts
 */

// --- Inlined from bm25-tokenizer.ts ---

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'on', 'at', 'to', 'for', 'of',
  'and', 'or', 'but', 'not', 'with', 'this', 'that', 'it', 'be',
  'are', 'was', 'were', 'been', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'shall', 'from', 'by', 'as', 'if', 'then', 'than', 'so', 'no',
  'up', 'out', 'about', 'into', 'over', 'after', 'its', 'my', 'your',
  'his', 'her', 'our', 'their', 'we', 'you', 'he', 'she', 'they',
  'me', 'him', 'us', 'them', 'who', 'what', 'which', 'when', 'where',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'only', 'own', 'same', 'just', 'also',
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
  '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这',
]);

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function tokenizeBM25(text: string): { indices: number[]; values: number[] } {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));

  const tf = new Map<number, number>();
  for (const token of cleaned) {
    const idx = fnv1aHash(token);
    tf.set(idx, (tf.get(idx) ?? 0) + 1);
  }

  const entries = [...tf.entries()].sort((a, b) => a[0] - b[0]);
  return {
    indices: entries.map(([idx]) => idx),
    values: entries.map(([, count]) => count),
  };
}

// --- Script logic ---

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION = 'document_chunks';
const BATCH_SIZE = 50;

async function qdrantFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${QDRANT_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`Qdrant ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  // 1. Get collection info
  const info = await qdrantFetch(`/collections/${COLLECTION}`);
  const totalPoints = info.result.points_count;
  console.log(`Collection: ${COLLECTION}, Total points: ${totalPoints}`);

  // 2. Scroll through all points
  let offset: string | number | null = null;
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const scrollBody: any = {
      limit: BATCH_SIZE,
      with_payload: ['text'],
      with_vector: false,
    };
    if (offset !== null) scrollBody.offset = offset;

    const scrollRes = await qdrantFetch(`/collections/${COLLECTION}/points/scroll`, {
      method: 'POST',
      body: JSON.stringify(scrollBody),
    });

    const points = scrollRes.result.points;
    if (!points || points.length === 0) break;

    // 3. For each point, generate BM25 and update
    const updatePoints: any[] = [];
    for (const point of points) {
      const text = point.payload?.text;
      if (!text || typeof text !== 'string') {
        skipped++;
        continue;
      }

      const sparse = tokenizeBM25(text);
      if (sparse.indices.length === 0) {
        skipped++;
        continue;
      }

      updatePoints.push({
        id: point.id,
        vector: {
          bm25: sparse,
        },
      });
    }

    // 4. Batch upsert sparse vectors
    if (updatePoints.length > 0) {
      await qdrantFetch(`/collections/${COLLECTION}/points/vectors`, {
        method: 'PUT',
        body: JSON.stringify({ points: updatePoints }),
      });
      updated += updatePoints.length;
    }

    processed += points.length;
    offset = scrollRes.result.next_page_offset;
    console.log(`Progress: ${processed}/${totalPoints} (updated: ${updated}, skipped: ${skipped})`);

    if (offset === null || offset === undefined) break;
  }

  console.log(`\nDone! Processed: ${processed}, Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
