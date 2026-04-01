import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';

export const redisConnection = new IORedis.default(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const fileParseQueue = new Queue('file-parse', {
  connection: redisConnection,
});
