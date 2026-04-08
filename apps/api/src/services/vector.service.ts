import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'node:crypto';
import { config } from '../lib/config.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

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
    });
    console.log(`[vector] Created collection: ${COLLECTION_NAME}`);
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

  const points = chunks.map((chunk, i) => ({
    id: crypto.randomUUID(),
    vector: embeddings[i],
    payload: {
      user_id: userId,
      file_id: fileId,
      folder_id: folderId ?? '',
      file_name: fileName,
      chunk_index: chunk.index,
      text: chunk.text,
    },
  }));

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
  scopeType: string;
  scopeId?: string;
  limit?: number;
}): Promise<Array<{ text: string; fileId: string; fileName: string; chunkIndex: number; score: number }>> {
  const { userId, query, scopeType, scopeId, limit = 10 } = params;

  const must: Array<{ key: string; match: { value: string } }> = [
    { key: 'user_id', match: { value: userId } },
  ];

  if (scopeType === 'folder' && scopeId) {
    must.push({ key: 'folder_id', match: { value: scopeId } });
  } else if (scopeType === 'file' && scopeId) {
    must.push({ key: 'file_id', match: { value: scopeId } });
  }

  const results = await qdrant.search(COLLECTION_NAME, {
    vector: query,
    filter: { must },
    limit,
    with_payload: true,
  });

  const rawResults = results.map((r) => ({
    text: (r.payload as Record<string, unknown>).text as string,
    fileId: (r.payload as Record<string, unknown>).file_id as string,
    fileName: (r.payload as Record<string, unknown>).file_name as string,
    chunkIndex: (r.payload as Record<string, unknown>).chunk_index as number,
    score: r.score,
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
