import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';
import { generatePreviewUrl } from '../services/s3.service.js';

export default async function sharesRoutes(fastify: FastifyInstance) {
  // POST /api/files/:fileId/share — 创建分享链接
  fastify.post('/files/:fileId/share', { preHandler: [requireAuth] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const userId = request.user!.id;
    const body = request.body as { expiresIn?: number; permission?: string } || {};
    const permission = body.permission === 'download' ? 'download' : 'view';

    // Verify file belongs to user
    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, fileId), eq(schema.files.userId, userId)));
    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    // Check if share already exists for this file — update permission if changed
    const [existing] = await db.select().from(schema.shares).where(and(eq(schema.shares.fileId, fileId), eq(schema.shares.userId, userId)));
    if (existing) {
      if (existing.permission !== permission) {
        await db.update(schema.shares).set({ permission }).where(eq(schema.shares.id, existing.id));
      }
      return reply.send({ token: existing.token, permission, url: `${process.env.FRONTEND_URL || 'https://drive.verrrnm.cloud'}/share/${existing.token}` });
    }

    // Generate token
    const token = randomBytes(16).toString('hex');
    const expiresAt = body.expiresIn ? new Date(Date.now() + body.expiresIn * 3600000) : null;

    await db.insert(schema.shares).values({
      token,
      fileId,
      userId,
      expiresAt,
      permission,
    });

    return reply.status(201).send({
      token,
      permission,
      url: `${process.env.FRONTEND_URL || 'https://drive.verrrnm.cloud'}/share/${token}`,
    });
  });

  // DELETE /api/files/:fileId/share — 撤销分享
  fastify.delete('/files/:fileId/share', { preHandler: [requireAuth] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const userId = request.user!.id;

    await db.delete(schema.shares).where(and(eq(schema.shares.fileId, fileId), eq(schema.shares.userId, userId)));
    return reply.status(204).send();
  });

  // GET /api/shares/:token — 公开路由（无需认证）
  fastify.get('/shares/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const [share] = await db.select().from(schema.shares).where(eq(schema.shares.token, token));
    if (!share) {
      return reply.status(404).send({ error: 'Share not found or expired' });
    }

    // Check expiry
    if (share.expiresAt && new Date() > share.expiresAt) {
      return reply.status(410).send({ error: 'Share link has expired' });
    }

    // If this is a report share, redirect to report endpoint
    if (share.type === 'report') {
      return reply.status(404).send({ error: 'Use /shares/report/:token for report shares' });
    }

    if (!share.fileId) {
      return reply.status(404).send({ error: 'File not found' });
    }

    // Get file info
    const [file] = await db.select({
      id: schema.files.id,
      name: schema.files.name,
      mimeType: schema.files.mimeType,
      size: schema.files.size,
      summary: schema.files.summary,
      suggestedFolder: schema.files.suggestedFolder,
      s3Key: schema.files.s3Key,
      createdAt: schema.files.createdAt,
    }).from(schema.files).where(eq(schema.files.id, share.fileId));

    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    // Get presigned URL for download
    const downloadUrl = await generatePreviewUrl(file.s3Key);

    // Get sharer name
    const [owner] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, share.userId));

    return reply.send({
      file: {
        name: file.name,
        mimeType: file.mimeType,
        size: Number(file.size),
        summary: file.summary,
        createdAt: file.createdAt,
      },
      downloadUrl,
      permission: share.permission || 'view',
      sharedBy: owner?.name || 'Unknown',
    });
  });

  // GET /shares/report/:token — 公开查看分享的报告
  fastify.get('/shares/report/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const [share] = await db.select().from(schema.shares)
      .where(and(eq(schema.shares.token, token), eq(schema.shares.type, 'report')));

    if (!share || !share.reportId) {
      return reply.status(404).send({ error: 'Report share not found' });
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      return reply.status(410).send({ error: 'Share link has expired' });
    }

    const [report] = await db.select().from(schema.reports).where(eq(schema.reports.id, share.reportId));
    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    const [fileCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.files)
      .where(and(eq(schema.files.userId, share.userId), sql`${schema.files.summary} IS NOT NULL`));

    const [owner] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, share.userId));

    return reply.send({
      report: report.content,
      createdAt: report.createdAt,
      fileCount: Number(fileCount?.count || 0),
      sharedBy: owner?.name || 'AI Drive 用户',
    });
  });
}
