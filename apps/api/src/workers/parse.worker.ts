import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis.default(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'file-parse',
  async (job: Job) => {
    console.log(`[file-parse] Processing job ${job.id}`, job.data);
    // TODO: implement file parsing logic
  },
  { connection },
);

worker.on('completed', (job) => {
  console.log(`[file-parse] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[file-parse] Job ${job?.id} failed:`, err.message);
});

console.log('[file-parse] Worker started');
