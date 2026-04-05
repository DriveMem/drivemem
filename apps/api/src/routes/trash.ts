import { FastifyInstance } from 'fastify';
import { eq, and, desc, sql, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { deleteObject } from '../services/s3.service.js';
import { deleteByFileId } from '../services/vector.service.js';

export default async function trashRoutes(fastify: FastifyInstance) {
  // GET / — list trashed files
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const trashedFiles = await db.select()
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), isNotNull(schema.files.deletedAt)))
      .orderBy(desc(schema.files.deletedAt));

    return reply.send(trashedFiles);
  });

  // POST /:id/restore — restore file from trash
  fastify.post('/:id/restore', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [file] = await db.select()
      .from(schema.files)
      .where(and(eq(schema.files.id, id), eq(schema.files.userId, userId), isNotNull(schema.files.deletedAt)));

    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'Trashed file not found', 404);

    await db.update(schema.files)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(schema.files.id, id));

    return reply.send({ success: true });
  });

  // DELETE /:id — permanently delete
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [file] = await db.select()
      .from(schema.files)
      .where(and(eq(schema.files.id, id), eq(schema.files.userId, userId), isNotNull(schema.files.deletedAt)));

    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'Trashed file not found', 404);

    // Delete S3 object
    await deleteObject(file.s3Key);

    // Delete vectors
    try { await deleteByFileId(id); } catch { /* ignore */ }

    // Delete DB record
    await db.delete(schema.files).where(eq(schema.files.id, id));

    // Update storage
    await db.update(schema.users)
      .set({ storageUsed: sql`GREATEST(${schema.users.storageUsed} - ${file.size}, 0)` })
      .where(eq(schema.users.id, userId));

    return reply.send({ success: true });
  });

  // DELETE / — empty trash (permanently delete all)
  fastify.delete('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const trashedFiles = await db.select()
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), isNotNull(schema.files.deletedAt)));

    let freedSize = 0;
    for (const file of trashedFiles) {
      await deleteObject(file.s3Key);
      try { await deleteByFileId(file.id); } catch { /* ignore */ }
      await db.delete(schema.files).where(eq(schema.files.id, file.id));
      freedSize += file.size;
    }

    if (freedSize > 0) {
      await db.update(schema.users)
        .set({ storageUsed: sql`GREATEST(${schema.users.storageUsed} - ${freedSize}, 0)` })
        .where(eq(schema.users.id, userId));
    }

    return reply.send({ success: true, deleted: trashedFiles.length });
  });
}
