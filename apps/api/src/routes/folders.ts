import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { deleteObject } from '../services/s3.service.js';

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable(),
  brief: z.string().optional(),
  status: z.string().optional(),
  goal: z.string().optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  brief: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
});

async function getOwnedFolder(folderId: string, userId: string) {
  const [folder] = await db.select()
    .from(schema.folders)
    .where(and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId)));
  if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Folder not found', 404);
  return folder;
}

async function deleteFolderRecursive(folderId: string, userId: string): Promise<void> {
  // Delete files in this folder
  const filesToDelete = await db.select()
    .from(schema.files)
    .where(and(eq(schema.files.folderId, folderId), eq(schema.files.userId, userId)));

  for (const file of filesToDelete) {
    await deleteObject(file.s3Key);
    await db.delete(schema.files).where(eq(schema.files.id, file.id));
    await db.update(schema.users)
      .set({ storageUsed: sql`GREATEST(${schema.users.storageUsed} - ${file.size}, 0)` })
      .where(eq(schema.users.id, userId));
  }

  // Recurse into child folders
  const children = await db.select()
    .from(schema.folders)
    .where(and(eq(schema.folders.parentId, folderId), eq(schema.folders.userId, userId)));

  for (const child of children) {
    await deleteFolderRecursive(child.id, userId);
  }

  // Delete the folder itself
  await db.delete(schema.folders).where(eq(schema.folders.id, folderId));
}

export default async function folderRoutes(fastify: FastifyInstance) {
  // POST / — create folder
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createFolderSchema.parse(request.body);
    const userId = request.user!.id;

    // Validate parentId
    if (body.parentId) {
      await getOwnedFolder(body.parentId, userId);
    }

    // Check same-level name uniqueness
    const conditions = [
      eq(schema.folders.name, body.name),
      eq(schema.folders.userId, userId),
    ];
    if (body.parentId) {
      conditions.push(eq(schema.folders.parentId, body.parentId));
    } else {
      conditions.push(sql`${schema.folders.parentId} IS NULL`);
    }
    const [existing] = await db.select({ id: schema.folders.id }).from(schema.folders).where(and(...conditions));
    if (existing) {
      throw new AppError(ErrorCodes.CONFLICT, 'A folder with this name already exists at this level', 409);
    }

    const [folder] = await db.insert(schema.folders).values({
      name: body.name,
      parentId: body.parentId,
      userId,
      ...(body.brief !== undefined && { brief: body.brief }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.goal !== undefined && { goal: body.goal }),
    }).returning();

    return reply.status(201).send(folder);
  });

  // GET / — list folders (with file counts)
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const folderList = await db.select()
      .from(schema.folders)
      .where(eq(schema.folders.userId, userId));
    
    // Add file count per folder
    const foldersWithCount = await Promise.all(folderList.map(async (folder) => {
      const [result] = await db.select({ count: sql`count(*)` })
        .from(schema.files)
        .where(and(eq(schema.files.userId, userId), eq(schema.files.folderId, folder.id)));
      return { ...folder, fileCount: Number(result?.count || 0) };
    }));
    
    return reply.send({ folders: foldersWithCount });
  });

  // PATCH /:id — update folder (name, brief, status, goal)
  fastify.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateFolderSchema.parse(request.body);
    const userId = request.user!.id;

    const folder = await getOwnedFolder(id, userId);

    // Check same-level name uniqueness if name is being changed
    if (body.name && body.name !== folder.name) {
      const conditions = [
        eq(schema.folders.name, body.name),
        eq(schema.folders.userId, userId),
      ];
      if (folder.parentId) {
        conditions.push(eq(schema.folders.parentId, folder.parentId));
      } else {
        conditions.push(sql`${schema.folders.parentId} IS NULL`);
      }
      const [existing] = await db.select({ id: schema.folders.id }).from(schema.folders).where(and(...conditions));
      if (existing && existing.id !== id) {
        throw new AppError(ErrorCodes.CONFLICT, 'A folder with this name already exists at this level', 409);
      }
    }

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.brief !== undefined) updates.brief = body.brief;
    if (body.status !== undefined) updates.status = body.status;
    if (body.goal !== undefined) updates.goal = body.goal;

    if (Object.keys(updates).length === 0) {
      return reply.send(folder);
    }

    const [updated] = await db.update(schema.folders)
      .set(updates)
      .where(eq(schema.folders.id, id))
      .returning();

    return reply.send(updated);
  });

  // DELETE /:id — recursive delete
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    await getOwnedFolder(id, userId);
    await deleteFolderRecursive(id, userId);

    return reply.send({ success: true });
  });
}
