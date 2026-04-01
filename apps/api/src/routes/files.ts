import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { fileParseQueue } from '../lib/queue.js';
import { generateUploadUrl, generatePreviewUrl, headObject, deleteObject } from '../services/s3.service.js';
import { MAX_FILE_SIZE, SUPPORTED_MIME_TYPES } from '@ai-drive/shared';

// --- Schemas ---

const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().int().positive(),
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

const listQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  status: z.enum(['uploading', 'parsing', 'indexed', 'failed']).optional(),
});

// --- Helper ---

async function getOwnedFile(fileId: string, userId: string) {
  const [file] = await db
    .select()
    .from(schema.files)
    .where(and(eq(schema.files.id, fileId), eq(schema.files.userId, userId)));
  if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);
  return file;
}

async function resolveUniqueName(name: string, folderId: string | null, userId: string, excludeId?: string): Promise<string> {
  let candidate = name;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const conditions = [
      eq(schema.files.name, candidate),
      eq(schema.files.userId, userId),
    ];
    if (folderId) {
      conditions.push(eq(schema.files.folderId, folderId));
    } else {
      conditions.push(sql`${schema.files.folderId} IS NULL`);
    }
    const [existing] = await db.select({ id: schema.files.id }).from(schema.files).where(and(...conditions));
    if (!existing || (excludeId && existing.id === excludeId)) return candidate;
    suffix++;
    const dotIdx = name.lastIndexOf('.');
    if (dotIdx > 0) {
      candidate = `${name.slice(0, dotIdx)} (${suffix})${name.slice(dotIdx)}`;
    } else {
      candidate = `${name} (${suffix})`;
    }
  }
}

// --- Plugin ---

export default async function fileRoutes(fastify: FastifyInstance) {
  // POST /upload-url
  fastify.post('/upload-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = uploadUrlSchema.parse(request.body);
    const userId = request.user!.id;

    // Validate mime type
    if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(body.mimeType)) {
      throw new AppError(ErrorCodes.UNSUPPORTED_FILE_TYPE, 'Unsupported file type', 400);
    }

    // Validate size
    if (body.size > MAX_FILE_SIZE) {
      throw new AppError(ErrorCodes.FILE_TOO_LARGE, 'File too large', 400);
    }

    // Check storage limit
    const [user] = await db.select({ storageUsed: schema.users.storageUsed, storageLimit: schema.users.storageLimit })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!user) throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    if (user.storageUsed + body.size > user.storageLimit) {
      throw new AppError(ErrorCodes.STORAGE_LIMIT_EXCEEDED, 'Storage limit exceeded', 413);
    }

    // Validate folderId
    if (body.folderId) {
      const [folder] = await db.select({ id: schema.folders.id })
        .from(schema.folders)
        .where(and(eq(schema.folders.id, body.folderId), eq(schema.folders.userId, userId)));
      if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Folder not found', 404);
    }

    // Create file record
    const s3Key = `users/${userId}/files/${crypto.randomUUID()}/${body.fileName}`;
    const uniqueName = await resolveUniqueName(body.fileName, body.folderId, userId);

    const [file] = await db.insert(schema.files).values({
      name: uniqueName,
      originalName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
      status: 'uploading',
      folderId: body.folderId,
      userId,
      s3Key,
    }).returning();

    const uploadUrl = await generateUploadUrl(s3Key, body.mimeType);

    return reply.send({ uploadUrl, fileId: file.id, s3Key });
  });

  // POST /confirm
  fastify.post('/confirm', { preHandler: [requireAuth] }, async (request, reply) => {
    const { fileId } = confirmSchema.parse(request.body);
    const userId = request.user!.id;

    const file = await getOwnedFile(fileId, userId);
    if (file.status !== 'uploading') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'File is not in uploading status', 400);
    }

    // Verify S3 object exists
    const exists = await headObject(file.s3Key);
    if (!exists) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'S3 object not found. Upload may not be complete.', 404);
    }

    // Update file status
    await db.update(schema.files)
      .set({ status: 'parsing', updatedAt: new Date() })
      .where(eq(schema.files.id, fileId));

    // Update storage used
    await db.update(schema.users)
      .set({ storageUsed: sql`${schema.users.storageUsed} + ${file.size}` })
      .where(eq(schema.users.id, userId));

    // Enqueue parse job
    await fileParseQueue.add('parse', {
      fileId,
      userId,
      s3Key: file.s3Key,
      mimeType: file.mimeType,
    });

    return reply.send({ fileId, status: 'parsing' });
  });

  // GET / — file list
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = listQuerySchema.parse(request.query);

    const conditions = [eq(schema.files.userId, userId)];
    if (query.folderId) {
      conditions.push(eq(schema.files.folderId, query.folderId));
    }
    if (query.status) {
      conditions.push(eq(schema.files.status, query.status));
    }

    const fileList = await db.select()
      .from(schema.files)
      .where(and(...conditions))
      .orderBy(desc(schema.files.updatedAt));

    return reply.send(fileList);
  });

  // GET /:id — file detail
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await getOwnedFile(id, request.user!.id);
    return reply.send(file);
  });

  // PATCH /:id — rename
  fastify.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = renameSchema.parse(request.body);
    const userId = request.user!.id;

    const file = await getOwnedFile(id, userId);
    const uniqueName = await resolveUniqueName(name, file.folderId, userId, id);

    const [updated] = await db.update(schema.files)
      .set({ name: uniqueName, updatedAt: new Date() })
      .where(eq(schema.files.id, id))
      .returning();

    return reply.send(updated);
  });

  // DELETE /:id
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const file = await getOwnedFile(id, userId);

    // Delete S3 object
    await deleteObject(file.s3Key);

    // Delete DB record
    await db.delete(schema.files).where(eq(schema.files.id, id));

    // Update storage
    await db.update(schema.users)
      .set({ storageUsed: sql`GREATEST(${schema.users.storageUsed} - ${file.size}, 0)` })
      .where(eq(schema.users.id, userId));

    return reply.send({ success: true });
  });

  // POST /:id/move — move file to another folder
  fastify.post('/:id/move', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { folderId } = moveSchema.parse(request.body);
    const userId = request.user!.id;

    await getOwnedFile(id, userId);

    // Validate target folder
    if (folderId) {
      const [folder] = await db.select({ id: schema.folders.id })
        .from(schema.folders)
        .where(and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId)));
      if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Target folder not found', 404);
    }

    const [updated] = await db.update(schema.files)
      .set({ folderId, updatedAt: new Date() })
      .where(eq(schema.files.id, id))
      .returning();

    return reply.send(updated);
  });

  // GET /:id/preview-url
  fastify.get('/:id/preview-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await getOwnedFile(id, request.user!.id);
    const previewUrl = await generatePreviewUrl(file.s3Key);
    return reply.send({ previewUrl, mimeType: file.mimeType });
  });
}
