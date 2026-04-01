import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { files, folders, users } from '../db/schema.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { requireAuth } from '../plugins/auth.js';
import { generateUploadUrl, generatePreviewUrl, headObject, deleteObject } from '../services/s3.service.js';
import { fileParseQueue } from '../lib/queue.js';
import { MAX_FILE_SIZE, SUPPORTED_MIME_TYPES } from '@ai-drive/shared';

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string(),
  size: z.number().positive(),
  folderId: z.string().uuid().nullable(),
});

const confirmSchema = z.object({
  fileId: z.string().uuid(),
});

const renameSchema = z.object({
  name: z.string().min(1).max(255),
});

const moveSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

export default async function fileRoutes(fastify: FastifyInstance) {
  // POST /upload-url
  fastify.post('/upload-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = uploadUrlSchema.parse(request.body);
    const userId = request.user!.id;

    // Validate mimeType
    if (!SUPPORTED_MIME_TYPES.includes(body.mimeType as typeof SUPPORTED_MIME_TYPES[number])) {
      throw new AppError(ErrorCodes.UNSUPPORTED_FILE_TYPE, 'Unsupported file type', 400);
    }

    // Validate size
    if (body.size > MAX_FILE_SIZE) {
      throw new AppError(ErrorCodes.FILE_TOO_LARGE, 'File exceeds 50MB limit', 413);
    }

    // Check storage limit
    const [user] = await db.select({ storageUsed: users.storageUsed, storageLimit: users.storageLimit })
      .from(users).where(eq(users.id, userId));
    if (user.storageUsed + body.size > user.storageLimit) {
      throw new AppError(ErrorCodes.STORAGE_LIMIT_EXCEEDED, 'Storage limit exceeded', 413);
    }

    // Validate folderId
    if (body.folderId) {
      const [folder] = await db.select({ id: folders.id }).from(folders)
        .where(and(eq(folders.id, body.folderId), eq(folders.userId, userId)));
      if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Folder not found', 404);
    }

    const fileId = crypto.randomUUID();
    const s3Key = `users/${userId}/files/${fileId}/${body.fileName}`;
    const uploadUrl = await generateUploadUrl(s3Key, body.mimeType);

    await db.insert(files).values({
      id: fileId,
      name: body.fileName,
      originalName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
      status: 'uploading',
      folderId: body.folderId,
      userId,
      s3Key,
    });

    return reply.send({ uploadUrl, fileId, s3Key });
  });

  // POST /confirm
  fastify.post('/confirm', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = confirmSchema.parse(request.body);
    const userId = request.user!.id;

    const [file] = await db.select().from(files)
      .where(and(eq(files.id, body.fileId), eq(files.userId, userId), eq(files.status, 'uploading')));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found or not in uploading state', 400);

    const exists = await headObject(file.s3Key);
    if (!exists) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found in storage', 400);

    await db.update(files).set({ status: 'parsing', updatedAt: new Date() }).where(eq(files.id, file.id));
    await db.update(users).set({ storageUsed: sql`${users.storageUsed} + ${file.size}` }).where(eq(users.id, userId));
    await fileParseQueue.add('parse', { fileId: file.id, userId, s3Key: file.s3Key, mimeType: file.mimeType });

    return reply.send({ fileId: file.id, status: 'parsing' });
  });

  // GET / — list files
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as { folderId?: string; status?: string };
    const userId = request.user!.id;

    const conditions = [eq(files.userId, userId)];
    if (query.folderId) conditions.push(eq(files.folderId, query.folderId));
    if (query.status) conditions.push(eq(files.status, query.status as 'uploading' | 'parsing' | 'indexed' | 'failed'));

    const result = await db.select().from(files).where(and(...conditions)).orderBy(desc(files.updatedAt));
    return reply.send({ files: result });
  });

  // GET /:id — file detail
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [file] = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, userId)));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);
    return reply.send(file);
  });

  // PATCH /:id — rename
  fastify.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = renameSchema.parse(request.body);
    const userId = request.user!.id;

    const [file] = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, userId)));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);

    // Check name conflict in same folder
    let newName = body.name;
    const existing = await db.select({ name: files.name }).from(files)
      .where(and(
        eq(files.userId, userId),
        file.folderId ? eq(files.folderId, file.folderId) : sql`${files.folderId} IS NULL`,
        eq(files.name, newName),
        sql`${files.id} != ${id}`,
      ));
    if (existing.length > 0) {
      const ext = newName.includes('.') ? '.' + newName.split('.').pop() : '';
      const base = ext ? newName.slice(0, -ext.length) : newName;
      newName = `${base}(1)${ext}`;
    }

    const [updated] = await db.update(files).set({ name: newName, updatedAt: new Date() })
      .where(eq(files.id, id)).returning();
    return reply.send(updated);
  });

  // DELETE /:id
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [file] = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, userId)));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);

    await deleteObject(file.s3Key);
    await db.delete(files).where(eq(files.id, id));
    await db.update(users).set({ storageUsed: sql`GREATEST(${users.storageUsed} - ${file.size}, 0)` })
      .where(eq(users.id, userId));

    return reply.status(204).send();
  });

  // GET /:id/preview-url
  fastify.get('/:id/preview-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [file] = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, userId)));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);

    const previewUrl = await generatePreviewUrl(file.s3Key);
    return reply.send({ previewUrl, mimeType: file.mimeType });
  });

  // POST /:id/move
  fastify.post('/:id/move', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = moveSchema.parse(request.body);
    const userId = request.user!.id;

    const [file] = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, userId)));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);

    if (body.folderId) {
      const [folder] = await db.select({ id: folders.id }).from(folders)
        .where(and(eq(folders.id, body.folderId), eq(folders.userId, userId)));
      if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Target folder not found', 404);
    }

    const [updated] = await db.update(files).set({ folderId: body.folderId, updatedAt: new Date() })
      .where(eq(files.id, id)).returning();
    return reply.send(updated);
  });

  // POST /:id/retry-parse — retry failed file parsing
  fastify.post('/:id/retry-parse', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [file] = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, userId)));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);
    if (file.status !== 'failed') throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only failed files can be retried', 400);

    await db.update(files).set({ status: 'parsing', errorMessage: null, updatedAt: new Date() }).where(eq(files.id, id));
    await fileParseQueue.add('parse', { fileId: file.id, userId, s3Key: file.s3Key, mimeType: file.mimeType });

    return reply.send({ fileId: file.id, status: 'parsing' });
  });
}
