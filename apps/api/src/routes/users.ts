import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, sql, isNotNull, isNull, desc, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
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

  // GET /me/insights
  fastify.get('/me/insights', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    // Check cached insight
    const [user] = await db.select({ insight: schema.users.insight })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (user?.insight) {
      return reply.send({ insight: user.insight });
    }

    // Generate insight from summaries + knowledge links
    const userFiles = await db.select({ name: schema.files.name, summary: schema.files.summary })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), sql`${schema.files.summary} IS NOT NULL`));

    if (userFiles.length < 2) {
      return reply.send({ insight: null });
    }

    const links = await db.select({
      relationType: schema.knowledgeLinks.relationType,
      description: schema.knowledgeLinks.description,
    })
      .from(schema.knowledgeLinks)
      .where(eq(schema.knowledgeLinks.userId, userId));

    const { chat } = await import('../services/llm.service.js');

    const fileSummaries = userFiles.map(f => `${f.name}: ${f.summary?.substring(0, 100)}`).join('\n');
    const linkInfo = links.length > 0
      ? links.map(l => `${l.relationType}: ${l.description}`).join('\n')
      : '暂无关联';

    const prompt = `用户有以下文件：\n${fileSummaries}\n\n文件间关联：\n${linkInfo}\n\n用80字以内总结用户知识库的特点和文件间关系。简洁直白，不要学术语气，不要用"你好"开头。直接输出。`;

    try {
      const insight = await chat([{ role: 'user', content: prompt }]);
      const trimmed = insight.trim().slice(0, 500);

      // Cache
      await db.update(schema.users).set({ insight: trimmed }).where(eq(schema.users.id, userId));

      return reply.send({ insight: trimmed });
    } catch {
      return reply.send({ insight: null });
    }
  });

  // GET /me/stats — 活动统计
  fastify.get('/me/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [fileStats] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), sql`${schema.files.createdAt} > ${weekAgo.toISOString()}`));

    const [convStats] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.conversations)
      .where(and(eq(schema.conversations.userId, userId), sql`${schema.conversations.createdAt} > ${weekAgo.toISOString()}`));

    const [totalFiles] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.files)
      .where(eq(schema.files.userId, userId));

    const [totalConvs] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.conversations)
      .where(eq(schema.conversations.userId, userId));

    const [linkCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.knowledgeLinks)
      .where(eq(schema.knowledgeLinks.userId, userId));

    return reply.send({
      filesThisWeek: Number(fileStats?.count || 0),
      conversationsThisWeek: Number(convStats?.count || 0),
      totalFiles: Number(totalFiles?.count || 0),
      totalConversations: Number(totalConvs?.count || 0),
      knowledgeLinks: Number(linkCount?.count || 0),
    });
  });

  // PATCH /me/password — 修改密码
  fastify.patch('/me/password', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { currentPassword: string; newPassword: string };
    if (!body.currentPassword || !body.newPassword) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: '请填写当前密码和新密码', status: 400 } });
    }
    if (body.newPassword.length < 6) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: '新密码至少 6 位', status: 400 } });
    }

    const userId = request.user!.id;
    const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
    if (!user?.passwordHash) {
      return reply.status(400).send({ error: { code: 'NO_PASSWORD', message: '当前账号未设置密码（可能使用第三方登录）', status: 400 } });
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return reply.status(403).send({ error: { code: 'WRONG_PASSWORD', message: '当前密码不正确', status: 403 } });
    }

    const newHash = await bcrypt.hash(body.newPassword, 10);
    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));

    return reply.send({ message: '密码修改成功' });
  });
}
