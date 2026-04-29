import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { fileParseQueue } from '../lib/queue.js';
import { s3Client } from '../services/s3.service.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../lib/config.js';

const clipBodySchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url(),
  content: z.string().min(1).max(500000),
  selectedText: z.string().max(50000).optional(),
});

function sanitizeTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9\u4e00-\u9fff\-_. ]/g, '_').slice(0, 200);
}

export default async function clipRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = clipBodySchema.parse(request.body);
    const userId = request.user!.id;

    const fileId = crypto.randomUUID();
    const savedContent = body.selectedText || body.content;
    const buffer = Buffer.from(savedContent, 'utf-8');
    const size = buffer.length;

    // Check storage limit
    const [user] = await db.select({ storageUsed: schema.users.storageUsed, storageLimit: schema.users.storageLimit })
      .from(schema.users).where(eq(schema.users.id, userId));
    if (!user) throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    if (user.storageUsed + size > user.storageLimit) {
      throw new AppError(ErrorCodes.STORAGE_LIMIT_EXCEEDED, 'Storage limit exceeded', 413);
    }

    const s3Key = `users/${userId}/clips/${fileId}/${sanitizeTitle(body.title)}.md`;

    // Upload to MinIO
    await s3Client.send(new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: 'text/markdown',
    }));

    // Create file record
    await db.insert(schema.files).values({
      id: fileId,
      name: `${body.title}.clip`,
      originalName: body.url,
      mimeType: 'text/markdown',
      size,
      status: 'parsing',
      userId,
      s3Key,
      source: 'upload',
      // folderId omitted — DB defaults to null
    });

    // Update storage
    await db.update(schema.users).set({ storageUsed: sql`${schema.users.storageUsed} + ${size}` }).where(eq(schema.users.id, userId));

    // Enqueue parse job
    await fileParseQueue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });

    return reply.status(201).send({ fileId, status: 'parsing', title: body.title });
  });
}
