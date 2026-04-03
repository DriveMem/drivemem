import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'node:crypto';
import { config } from '../lib/config.js';

const COLLECTION_NAME = 'document_chunks';
const VECTOR_SIZE = 512; // bge-small-zh-v1.5

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

export async function searchSimilar(params: {
  userId: string;
  query: number[];
  scopeType: string;
  scopeId?: string;
  limit?: number;
}): Promise<Array<{ text: string; fileId: string; fileName: string; chunkIndex: number; score: number }>> {
  const { userId, query, scopeType, scopeId, limit = 5 } = params;

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

  return results.map((r) => ({
    text: (r.payload as Record<string, unknown>).text as string,
    fileId: (r.payload as Record<string, unknown>).file_id as string,
    fileName: (r.payload as Record<string, unknown>).file_name as string,
    chunkIndex: (r.payload as Record<string, unknown>).chunk_index as number,
    score: r.score,
  }));
}
