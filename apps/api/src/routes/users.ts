import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, sql, isNotNull, isNull, desc, inArray, gte } from 'drizzle-orm';
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

  // GET /me/connections — Connected agents status
  fastify.get('/me/connections', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const connections = await db.select({
      id: schema.agentConnections.id,
      agentName: schema.agentConnections.agentName,
      transport: schema.agentConnections.transport,
      connectedAt: schema.agentConnections.connectedAt,
      lastActiveAt: schema.agentConnections.lastActiveAt,
      disconnectedAt: schema.agentConnections.disconnectedAt,
      status: schema.agentConnections.status,
    })
      .from(schema.agentConnections)
      .where(and(
        eq(schema.agentConnections.userId, userId),
        gte(schema.agentConnections.connectedAt, weekAgo),
        sql`${schema.agentConnections.status} != 'disconnected'`,
      ))
      .orderBy(desc(schema.agentConnections.lastActiveAt));

    // Group by agentName — pick latest connection per agent
    const agentMap = new Map<string, typeof connections[0]>();
    for (const conn of connections) {
      const name = conn.agentName || 'unknown';
      if (!agentMap.has(name)) agentMap.set(name, conn);
    }

    // Count total calls per agent from api_activity_logs
    const callCounts = new Map<string, number>();
    if (agentMap.size > 0) {
      const rows = await db.select({
        agentName: schema.apiActivityLogs.agentName,
        count: sql<number>`count(*)`,
      })
        .from(schema.apiActivityLogs)
        .where(and(
          eq(schema.apiActivityLogs.userId, userId),
          gte(schema.apiActivityLogs.createdAt, weekAgo),
        ))
        .groupBy(schema.apiActivityLogs.agentName);
      for (const r of rows) {
        callCounts.set(r.agentName || 'unknown', Number(r.count));
      }
    }

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const agents = [...agentMap.entries()].map(([name, conn]) => {
      const isOnline = conn.status === 'online' && conn.lastActiveAt && new Date(conn.lastActiveAt) > tenMinAgo;
      return {
        name,
        status: isOnline ? 'online' : 'offline',
        lastActiveAt: conn.lastActiveAt,
        disconnectedAt: conn.disconnectedAt,
        transport: conn.transport,
        totalCalls: callCounts.get(name) || 0,
      };
    });

    agents.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
      return new Date(b.lastActiveAt!).getTime() - new Date(a.lastActiveAt!).getTime();
    });

    return reply.send({ agents });
  });



  // PATCH /me/agents/:name — Rename an agent
  fastify.patch('/me/agents/:name', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { name } = request.params as { name: string };
    const body = z.object({ newName: z.string().min(1).max(100) }).parse(request.body);

    const updated = await db.update(schema.agentConnections)
      .set({ agentName: body.newName })
      .where(and(
        eq(schema.agentConnections.userId, userId),
        eq(schema.agentConnections.agentName, name),
      ))
      .returning({ id: schema.agentConnections.id });

    if (updated.length === 0) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Agent not found', 404);
    }
    return reply.send({ ok: true, renamed: updated.length });
  });

  // DELETE /me/agents/:name — Disconnect (soft-delete) an agent
  fastify.delete('/me/agents/:name', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { name } = request.params as { name: string };

    const updated = await db.update(schema.agentConnections)
      .set({ status: 'disconnected', disconnectedAt: new Date() })
      .where(and(
        eq(schema.agentConnections.userId, userId),
        eq(schema.agentConnections.agentName, name),
      ))
      .returning({ id: schema.agentConnections.id });

    if (updated.length === 0) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Agent not found', 404);
    }
    return reply.send({ ok: true, disconnected: updated.length });
  });

  // GET /me/agents/:name/logs — Get activity logs for a specific agent
  fastify.get('/me/agents/:name/logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { name } = request.params as { name: string };
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '20', 10) || 20, 100);

    const rows = await db.select({
      id: schema.apiActivityLogs.id,
      action: schema.apiActivityLogs.action,
      detail: schema.apiActivityLogs.detail,
      createdAt: schema.apiActivityLogs.createdAt,
    })
      .from(schema.apiActivityLogs)
      .where(and(
        eq(schema.apiActivityLogs.userId, userId),
        eq(schema.apiActivityLogs.agentName, name),
      ))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(limit);

    return reply.send({ logs: rows });
  });

  // POST /me/avatar
  fastify.post('/me/avatar', { preHandler: [requireAuth] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No file uploaded', 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only JPEG, PNG, GIF, WebP images are allowed', 400);
    }

    const { s3Client } = await import('../services/s3.service.js');
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { config } = await import('../lib/config.js');
    const { generatePreviewUrl } = await import('../services/s3.service.js');

    const ext = data.filename?.split('.').pop() || 'jpg';
    const s3Key = `avatars/${request.user!.id}.${ext}`;

    const buffer = await data.toBuffer();
    await s3Client.send(new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: data.mimetype,
    }));

    const avatarUrl = await generatePreviewUrl(s3Key);
    // Store the s3Key so we can regenerate signed URLs
    const storedUrl = `/api/users/me/avatar-image?key=${encodeURIComponent(s3Key)}`;

    await db.update(users).set({ avatarUrl: storedUrl, updatedAt: new Date() }).where(eq(users.id, request.user!.id));

    return reply.send({ avatarUrl: storedUrl });
  });

  // GET /me/avatar-image — serve avatar via signed URL redirect
  fastify.get('/me/avatar-image', { preHandler: [requireAuth] }, async (request, reply) => {
    const { key } = request.query as { key?: string };
    if (!key) {
      return reply.status(400).send({ error: 'Missing key' });
    }
    const { generatePreviewUrl } = await import('../services/s3.service.js');
    const url = await generatePreviewUrl(key);
    return reply.redirect(url);
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

  // GET /me/memories — 查看 AI 记忆
  fastify.get('/me/memories', { preHandler: [requireAuth] }, async (request, reply) => {
    const memories = await db.select()
      .from(schema.userMemory)
      .where(eq(schema.userMemory.userId, request.user!.id))
      .orderBy(desc(schema.userMemory.createdAt));
    return reply.send({ memories });
  });

  // DELETE /me/memories/:id — 删除单条记忆
  fastify.delete('/me/memories/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(schema.userMemory)
      .where(and(eq(schema.userMemory.id, id), eq(schema.userMemory.userId, request.user!.id)));
    return reply.status(204).send();
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

  // GET /me/profile — 获取个人档案
  fastify.get('/me/profile', { preHandler: [requireAuth] }, async (request, reply) => {
    const [user] = await db.select({ profile: users.profile, name: users.name, email: users.email, onboardingCompleted: users.onboardingCompleted, onboardingStep: users.onboardingStep, onboardingPath: users.onboardingPath })
      .from(users).where(eq(users.id, request.user!.id));
    if (!user) return reply.status(404).send({ error: 'User not found' });
    const profile = (user.profile as Record<string, any>) || {};
    return reply.send({ ...profile, name: user.name, email: user.email, onboardingCompleted: user.onboardingCompleted, onboardingStep: user.onboardingStep, onboardingPath: user.onboardingPath });
  });

  // PATCH /me/onboarding — 更新 onboarding 进度
  fastify.patch("/me/onboarding", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { step?: number; completed?: boolean; path?: string };
    const userId = request.user!.id;
    const updates: Record<string, any> = {};
    if (typeof body.step === "number") updates.onboardingStep = body.step;
    if (typeof body.completed === "boolean") updates.onboardingCompleted = body.completed;
    if (typeof body.path === "string") updates.onboardingPath = body.path;
    if (Object.keys(updates).length === 0) return reply.code(400).send({ error: "No valid fields" });
    await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, userId));
    return reply.send({ success: true });
  });

  // PATCH /me/profile — 更新个人档案
  fastify.patch('/me/profile', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { role?: string; currentGoal?: string; background?: string; preferences?: string };
    const userId = request.user!.id;
    const [user] = await db.select({ profile: users.profile }).from(users).where(eq(users.id, userId));
    const existingProfile = (user?.profile as Record<string, any>) || {};
    const newProfile = { ...existingProfile, ...body };
    await db.update(users).set({ profile: newProfile, updatedAt: new Date() }).where(eq(users.id, userId));
    return reply.send(newProfile);
  });
}
