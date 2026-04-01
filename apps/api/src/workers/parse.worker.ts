import { Worker, Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { getObject } from '../services/s3.service.js';
import { parseDocument } from '../services/parse.service.js';
import { chunkText } from '../services/chunk.service.js';
import { embedTexts } from '../services/llm.service.js';
import { ensureCollection, upsertChunks } from '../services/vector.service.js';
import IORedis from 'ioredis';

interface ParseJobData {
  fileId: string;
  userId: string;
  s3Key: string;
  mimeType: string;
}

const connection = new IORedis.default(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Ensure Qdrant collection exists on startup
await ensureCollection();

const worker = new Worker<ParseJobData>(
  'file-parse',
  async (job: Job<ParseJobData>) => {
    const { fileId, userId, s3Key, mimeType } = job.data;
    console.log(`[file-parse] Processing job ${job.id} for file ${fileId}`);

    // 1. Download from S3
    const buffer = await getObject(s3Key);
    console.log(`[file-parse] Downloaded ${buffer.length} bytes from S3`);

    // 2. Parse document
    const text = await parseDocument(buffer, mimeType);
    console.log(`[file-parse] Parsed ${text.length} chars`);

    // 3. Get file info for chunking
    const [file] = await db.select({ name: files.name, folderId: files.folderId })
      .from(files).where(eq(files.id, fileId));

    // 4. Chunk text
    const chunks = chunkText(text, file?.name ?? 'unknown');
    console.log(`[file-parse] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new AppError('PARSE_FAILED', 'No chunks generated from document', 400);
    }

    // 5. Generate embeddings
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embedTexts(chunkTexts);
    console.log(`[file-parse] Generated ${embeddings.length} embeddings`);

    // 6. Upsert to Qdrant
    await upsertChunks({
      userId,
      fileId,
      folderId: file?.folderId ?? null,
      fileName: file?.name ?? 'unknown',
      chunks,
      embeddings,
    });

    // 7. Update DB — success
    await db.update(files).set({
      status: 'indexed',
      chunkCount: chunks.length,
      updatedAt: new Date(),
    }).where(eq(files.id, fileId));

    console.log(`[file-parse] File ${fileId} indexed with ${chunks.length} chunks`);
  },
  {
    connection,
    concurrency: 2,
    limiter: undefined,
  },
);

worker.on('completed', (job) => {
  console.log(`[file-parse] Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
  console.error(`[file-parse] Job ${job?.id} failed:`, err.message);

  if (job) {
    const { fileId } = job.data as ParseJobData;
    try {
      await db.update(files).set({
        status: 'failed',
        errorMessage: err.message,
        updatedAt: new Date(),
      }).where(eq(files.id, fileId));
    } catch (dbErr) {
      console.error(`[file-parse] Failed to update DB for file ${fileId}:`, dbErr);
    }
  }
});

// Configure retry: max 3 attempts, don't retry PARSE_FAILED
worker.on('error', (err) => {
  console.error('[file-parse] Worker error:', err);
});

console.log('[file-parse] Worker started');
