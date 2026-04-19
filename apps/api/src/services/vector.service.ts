import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'node:crypto';
import { config } from '../lib/config.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { tokenizeBM25 } from './bm25-tokenizer.js';

const COLLECTION_NAME = 'document_chunks';
const VECTOR_SIZE = 1024; // text-embedding-v3

const qdrant = new QdrantClient({
  url: config.QDRANT_URL,
  apiKey: config.QDRANT_API_KEY,
});

export async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      sparse_vectors: { bm25: {} },
    });
    console.log(`[vector] Created collection: ${COLLECTION_NAME}`);
  } else {
    // Ensure sparse vector named 'bm25' exists on existing collection
    try {
      await fetch(`${config.QDRANT_URL}/collections/${COLLECTION_NAME}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(config.QDRANT_API_KEY ? { 'api-key': config.QDRANT_API_KEY } : {}),
        },
        body: JSON.stringify({ sparse_vectors: { bm25: {} } }),
      });
    } catch {
      // May already exist
    }
  }

  // Ensure payload indexes
  try {
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'user_id',
      field_schema: 'keyword',
    });
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'file_id',
      field_schema: 'keyword',
    });
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'folder_id',
      field_schema: 'keyword',
    });
  } catch {
    // Indexes may already exist
  }
}

export async function upsertChunks(params: {
  userId: string;
  fileId: string;
  folderId: string | null;
  fileName: string;
  chunks: Array<{ text: string; index: number }>;
  embeddings: number[][];
}): Promise<void> {
  const { userId, fileId, folderId, fileName, chunks, embeddings } = params;

  const points = chunks.map((chunk, i) => {
    const sparse = tokenizeBM25(chunk.text);
    return {
      id: crypto.randomUUID(),
      vector: {
        '': embeddings[i],
        bm25: sparse,
      },
      payload: {
        user_id: userId,
        file_id: fileId,
        folder_id: folderId ?? '',
        file_name: fileName,
        chunk_index: chunk.index,
        text: chunk.text,
      },
    };
  });

  // Upsert in batches of 100
  for (let i = 0; i < points.length; i += 100) {
    await qdrant.upsert(COLLECTION_NAME, {
      points: points.slice(i, i + 100),
    });
  }
}

export async function deleteByFileId(fileId: string): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [{ key: 'file_id', match: { value: fileId } }],
    },
  });
}

export async function deleteByUserId(userId: string): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [{ key: 'user_id', match: { value: userId } }],
    },
  });
}

// Preprocess search query: replace time words with actual dates
export function preprocessQuery(query: string): string {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  
  return query
    .replace(/今天/g, fmt(now))
    .replace(/昨天/g, fmt(daysAgo(1)))
    .replace(/前天/g, fmt(daysAgo(2)))
    .replace(/上周/g, `${fmt(daysAgo(7))}到${fmt(now)}`)
    .replace(/本周/g, `${fmt(daysAgo(now.getDay()))}到${fmt(now)}`)
    .replace(/最近/g, `${fmt(daysAgo(7))}以来`)
    .replace(/这个月/g, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    .replace(/上个月/g, `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);
}

export async function searchSimilar(params: {
  userId: string;
  query: number[];
  queryText?: string;
  scopeType: string;
  scopeId?: string;
  limit?: number;
}): Promise<Array<{ text: string; fileId: string; fileName: string; chunkIndex: number; score: number }>> {
  const { userId, query, queryText, scopeType, scopeId, limit = 10 } = params;

  const must: Array<{ key: string; match: { value: string } }> = [
    { key: 'user_id', match: { value: userId } },
  ];

  if (scopeType === 'folder' && scopeId) {
    must.push({ key: 'folder_id', match: { value: scopeId } });
  } else if (scopeType === 'file' && scopeId) {
    must.push({ key: 'file_id', match: { value: scopeId } });
  }

  // Hybrid search: dense + BM25 sparse with RRF fusion
  const sparseQuery = tokenizeBM25(queryText ?? '');
  const prefetch = [
    { query, using: '', limit: limit * 2 },
  ];
  // Only add BM25 prefetch if we have actual tokens
  if (sparseQuery.indices.length > 0) {
    prefetch.push({
      query: { indices: sparseQuery.indices, values: sparseQuery.values } as unknown as number[],
      using: 'bm25',
      limit: limit * 2,
    });
  }

  let results;
  if (prefetch.length > 1) {
    // Hybrid: dense + BM25 with RRF fusion
    results = await qdrant.query(COLLECTION_NAME, {
      prefetch,
      query: { fusion: 'rrf' as const },
      filter: { must },
      limit,
      with_payload: true,
    });
  } else {
    // Dense-only fallback (no BM25 tokens)
    results = await qdrant.query(COLLECTION_NAME, {
      query,
      filter: { must },
      limit,
      with_payload: true,
    });
  }

  const rawResults = results.points.map((r) => ({
    text: (r.payload as Record<string, unknown>).text as string,
    fileId: (r.payload as Record<string, unknown>).file_id as string,
    fileName: (r.payload as Record<string, unknown>).file_name as string,
    chunkIndex: (r.payload as Record<string, unknown>).chunk_index as number,
    score: r.score ?? 0,
  }));

  // Deduplicate: if multiple chunks from same file, keep highest scoring
  // Apply time decay: newer files get a boost
  const fileIds = [...new Set(rawResults.map(r => r.fileId))];
  const fileDates: Record<string, Date> = {};
  for (const fid of fileIds) {
    const [f] = await db.select({ id: schema.files.id, createdAt: schema.files.createdAt })
      .from(schema.files).where(eq(schema.files.id, fid));
    if (f) fileDates[f.id] = f.createdAt;
  }

  const now = Date.now();
  const boostedResults = rawResults.map(r => {
    const created = fileDates[r.fileId];
    const daysSince = created ? (now - new Date(created).getTime()) / 86400000 : 30;
    const timeDecay = 1 / (1 + daysSince * 0.01); // newer = higher
    return { ...r, score: r.score * (0.8 + 0.2 * timeDecay) }; // 80% similarity + 20% recency
  });

  boostedResults.sort((a, b) => b.score - a.score);
  return boostedResults;
}
