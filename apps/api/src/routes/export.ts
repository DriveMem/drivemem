import { FastifyInstance } from 'fastify';
import archiver from 'archiver';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { files, conversations, messages, users } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { getObject } from '../services/s3.service.js';
import { AppError } from '../lib/errors.js';

export default async function exportRoutes(app: FastifyInstance) {
  app.post('/export', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;

    // 检查总文件大小
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
    if (dbUser.storageUsed > 100 * 1024 * 1024) { // 100MB
      throw new AppError('EXPORT_TOO_LARGE', 'Data exceeds 100MB limit for sync export', 413);
    }

    const date = new Date().toISOString().slice(0, 10);

    reply.raw.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="ai-drive-export-${date}.zip"`,
    });

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(reply.raw);

    // 1. 用户文件
    const userFiles = await db.select().from(files).where(eq(files.userId, user.id));
    for (const file of userFiles) {
      try {
        const buffer = await getObject(file.s3Key);
        archive.append(buffer, { name: `files/${file.originalName}` });
      } catch {
        // Skip files that can't be downloaded
      }
    }

    // 2. 对话历史
    const userConversations = await db.select().from(conversations).where(eq(conversations.userId, user.id));
    for (const conv of userConversations) {
      const msgs = await db.select().from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(asc(messages.createdAt));

      const convData = {
        id: conv.id,
        title: conv.title,
        scopeType: conv.scopeType,
        messages: msgs.map(m => ({
          role: m.role,
          content: m.content,
          citations: m.citations,
          createdAt: m.createdAt,
        })),
      };
      archive.append(JSON.stringify(convData, null, 2), { name: `conversations/${conv.title || conv.id}.json` });
    }

    // 3. metadata.json
    const metadata = {
      exportDate: new Date().toISOString(),
      user: { id: user.id, email: dbUser.email, name: dbUser.name },
      fileCount: userFiles.length,
      conversationCount: userConversations.length,
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    await archive.finalize();
  });
}
