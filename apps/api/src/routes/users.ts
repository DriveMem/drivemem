import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, sql, isNotNull, isNull, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, files, knowledgeLinks } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';

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

  // GET /me/knowledge-profile
  fastify.get('/me/knowledge-profile', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const result = await db.select({
      topic: files.suggestedFolder,
      fileCount: sql<number>`count(*)`,
    })
      .from(files)
      .where(and(eq(files.userId, userId), isNotNull(files.suggestedFolder)))
      .groupBy(files.suggestedFolder);

    const [unclassified] = await db.select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(eq(files.userId, userId), isNull(files.suggestedFolder)));

    const totalFiles = await db.select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.userId, userId));

    return reply.send({
      topics: result.map(r => ({ topic: r.topic, fileCount: Number(r.fileCount) })),
      unclassifiedCount: Number(unclassified?.count || 0),
      totalFiles: Number(totalFiles[0]?.count || 0),
    });
  });

  // GET /me/knowledge-links
  fastify.get('/me/knowledge-links', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const links = await db.select({
      id: knowledgeLinks.id,
      fileAId: knowledgeLinks.fileAId,
      fileBId: knowledgeLinks.fileBId,
      relationType: knowledgeLinks.relationType,
      description: knowledgeLinks.description,
      createdAt: knowledgeLinks.createdAt,
    })
      .from(knowledgeLinks)
      .where(eq(knowledgeLinks.userId, userId))
      .orderBy(desc(knowledgeLinks.createdAt));

    const fileIds = [...new Set(links.flatMap(l => [l.fileAId, l.fileBId]))];
    const fileNames: Record<string, string> = {};
    if (fileIds.length > 0) {
      const filesData = await db.select({ id: files.id, name: files.name })
        .from(files)
        .where(inArray(files.id, fileIds));
      filesData.forEach(f => { fileNames[f.id] = f.name; });
    }

    return reply.send({
      links: links.map(l => ({
        ...l,
        fileAName: fileNames[l.fileAId] || 'Unknown',
        fileBName: fileNames[l.fileBId] || 'Unknown',
      })),
    });
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
}
