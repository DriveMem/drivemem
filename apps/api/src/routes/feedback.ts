import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { desc, sql } from 'drizzle-orm';

export default async function feedbackRoutes(fastify: FastifyInstance) {
  // POST / — 提交反馈（登录和未登录都可以）
  fastify.post('/', async (request, reply) => {
    const body = request.body as { content: string; email?: string; page?: string };
    if (!body.content || body.content.trim().length === 0) {
      return reply.status(400).send({ error: '请输入反馈内容' });
    }

    const userId = request.user?.id || null;

    await db.insert(schema.feedback).values({
      userId,
      content: body.content.trim().slice(0, 2000),
      email: body.email?.trim().slice(0, 200) || null,
      page: body.page?.slice(0, 200) || null,
    });

    return reply.status(201).send({ message: '感谢你的反馈！' });
  });
}
