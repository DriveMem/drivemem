import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import archiver from 'archiver';
import { db } from '../db/index.js';
import { users, files, conversations, messages } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { getObject, deletePrefix } from '../services/s3.service.js';
import { deleteByUserId } from '../services/vector.service.js';

const updateProfileSchema = z.object({
  name: z.string().max(100),
});

export default async function userRoutes(fastify: FastifyInstance) {
  // GET /me
  fastify.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        authProvider: users.authProvider,
        storageUsed: users.storageUsed,
        storageLimit: users.storageLimit,
        dailyChatCount: users.dailyChatCount,
        dailyChatLimit: users.dailyChatLimit,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, request.user!.id))
      .limit(1);

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    return reply.send(user);
  });

  // PATCH /me
  fastify.patch('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);

    const [user] = await db
      .update(users)
      .set({ name: body.name, updatedAt: new Date() })
      .where(eq(users.id, request.user!.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        authProvider: users.authProvider,
        storageUsed: users.storageUsed,
        storageLimit: users.storageLimit,
        dailyChatCount: users.dailyChatCount,
        dailyChatLimit: users.dailyChatLimit,
        createdAt: users.createdAt,
      });

    return reply.send(user);
  });

  // POST /me/export — data export as ZIP
  fastify.post('/me/export', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const MAX_EXPORT_SIZE = 100 * 1024 * 1024; // 100MB

    // Get user files
    const userFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, userId));

    // Check total size
    const totalSize = userFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_EXPORT_SIZE) {
      throw new AppError('EXPORT_TOO_LARGE', 'Export exceeds 100MB limit', 413);
    }

    // Get conversations with messages
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId));

    const conversationData: Array<Record<string, unknown>> = [];
    for (const conv of userConversations) {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id));
      conversationData.push({ ...conv, messages: msgs });
    }

    // Build ZIP
    reply.raw.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="ai-drive-export.zip"',
    });

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(reply.raw);

    // Add files
    for (const f of userFiles) {
      try {
        const buffer = await getObject(f.s3Key);
        archive.append(buffer, { name: `files/${f.originalName}` });
      } catch (err) {
        request.log.warn({ fileId: f.id, err }, 'Failed to download file for export');
      }
    }

    // Add conversations
    for (const conv of conversationData) {
      archive.append(JSON.stringify(conv, null, 2), {
        name: `conversations/${(conv as { id: string }).id}.json`,
      });
    }

    // Add metadata
    const metadata = {
      exportedAt: new Date().toISOString(),
      userId,
      fileCount: userFiles.length,
      conversationCount: userConversations.length,
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    await archive.finalize();
  });

  // DELETE /me — account deletion
  fastify.delete('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = z.object({ confirmation: z.literal('DELETE') }).parse(request.body);

    request.log.info({ userId }, 'Account deletion initiated');

    // 1. Delete all vectors from Qdrant
    try {
      await deleteByUserId(userId);
      request.log.info({ userId }, 'Qdrant vectors deleted');
    } catch (err) {
      request.log.error({ userId, err }, 'Failed to delete Qdrant vectors');
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to clean up vector data', 500);
    }

    // 2. Delete all S3 objects
    try {
      await deletePrefix(`users/${userId}/`);
      request.log.info({ userId }, 'S3 objects deleted');
    } catch (err) {
      request.log.error({ userId, err }, 'Failed to delete S3 objects');
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to clean up file storage', 500);
    }

    // 3. Delete user from PG (CASCADE deletes files, conversations, messages)
    await db.delete(users).where(eq(users.id, userId));
    request.log.info({ userId }, 'User deleted from database');

    return reply.status(204).send();
  });
}
