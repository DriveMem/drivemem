import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { folders, files, users } from '../db/schema.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { requireAuth } from '../plugins/auth.js';
import { deleteObject } from '../services/s3.service.js';

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable(),
});

const renameFolderSchema = z.object({
  name: z.string().min(1).max(255),
});

export default async function folderRoutes(fastify: FastifyInstance) {
  // POST / — create folder
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createFolderSchema.parse(request.body);
    const userId = request.user!.id;

    // Validate parentId
    if (body.parentId) {
      const [parent] = await db.select({ id: folders.id }).from(folders)
        .where(and(eq(folders.id, body.parentId), eq(folders.userId, userId)));
      if (!parent) throw new AppError(ErrorCodes.NOT_FOUND, 'Parent folder not found', 404);
    }

    // Check same-level name uniqueness
    const existing = await db.select({ id: folders.id }).from(folders)
      .where(and(
        eq(folders.userId, userId),
        eq(folders.name, body.name),
        body.parentId ? eq(folders.parentId, body.parentId) : sql`${folders.parentId} IS NULL`,
      ));
    if (existing.length > 0) {
      throw new AppError(ErrorCodes.CONFLICT, 'Folder with this name already exists', 409);
    }

    const [folder] = await db.insert(folders).values({
      name: body.name,
      parentId: body.parentId,
      userId,
    }).returning();

    return reply.status(201).send(folder);
  });

  // GET / — list all folders flat
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const result = await db.select().from(folders).where(eq(folders.userId, userId));
    return reply.send({ folders: result });
  });

  // PATCH /:id — rename
  fastify.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = renameFolderSchema.parse(request.body);
    const userId = request.user!.id;

    const [folder] = await db.select().from(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
    if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Folder not found', 404);

    // Check name uniqueness at same level
    const existing = await db.select({ id: folders.id }).from(folders)
      .where(and(
        eq(folders.userId, userId),
        eq(folders.name, body.name),
        folder.parentId ? eq(folders.parentId, folder.parentId) : sql`${folders.parentId} IS NULL`,
        sql`${folders.id} != ${id}`,
      ));
    if (existing.length > 0) {
      throw new AppError(ErrorCodes.CONFLICT, 'Folder with this name already exists', 409);
    }

    const [updated] = await db.update(folders).set({ name: body.name })
      .where(eq(folders.id, id)).returning();
    return reply.send(updated);
  });

  // DELETE /:id — recursive delete
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [folder] = await db.select().from(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
    if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Folder not found', 404);

    // Collect all folder IDs recursively
    const allFolderIds: string[] = [id];
    const collectChildren = async (parentIds: string[]) => {
      if (parentIds.length === 0) return;
      const children = await db.select({ id: folders.id }).from(folders)
        .where(and(eq(folders.userId, userId), inArray(folders.parentId, parentIds)));
      const childIds = children.map(c => c.id);
      allFolderIds.push(...childIds);
      await collectChildren(childIds);
    };
    await collectChildren([id]);

    // Delete all files in these folders
    const filesToDelete = await db.select({ id: files.id, s3Key: files.s3Key, size: files.size })
      .from(files)
      .where(and(eq(files.userId, userId), inArray(files.folderId, allFolderIds)));

    let totalSize = 0;
    for (const file of filesToDelete) {
      await deleteObject(file.s3Key);
      totalSize += file.size;
    }

    if (filesToDelete.length > 0) {
      await db.delete(files).where(inArray(files.id, filesToDelete.map(f => f.id)));
    }

    // Delete folders (children first due to potential self-referencing FK)
    await db.delete(folders).where(inArray(folders.id, allFolderIds));

    // Update storage
    if (totalSize > 0) {
      await db.update(users).set({ storageUsed: sql`GREATEST(${users.storageUsed} - ${totalSize}, 0)` })
        .where(eq(users.id, userId));
    }

    return reply.status(204).send();
  });
}
