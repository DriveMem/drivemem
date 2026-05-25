import { FastifyInstance } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { eq, desc, isNull } from 'drizzle-orm';
import { chat, ChatMessage } from '../services/llm.service.js';

export default async function conversationStartersRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = (request as any).userId as string;

    try {
      // Get user's 5 most recent files
      const recentFiles = await db
        .select({
          name: files.name,
          summary: files.summary,
        })
        .from(files)
        .where(eq(files.userId, userId))
        .orderBy(desc(files.createdAt))
        .limit(5);

      // No files → empty starters
      if (recentFiles.length === 0) {
        return reply.send({ starters: [] });
      }

      // Build context from file names + summaries
      const fileContext = recentFiles
        .map((f, i) => {
          const summary = f.summary ? f.summary.slice(0, 500) : '无摘要';
          return `${i + 1}. 文件名: ${f.name}\n   摘要: ${summary}`;
        })
        .join('\n\n');

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: '你是一个智能知识库助手。根据用户的知识库文件，生成有价值的建议问题帮助用户探索自己的知识。',
        },
        {
          role: 'user',
          content: `基于以下用户知识库文件，生成 4 个建议问题（覆盖总结、查找、对比、操作维度）。返回 JSON 数组格式，只返回 JSON，不要其他内容：["问题1","问题2","问题3","问题4"]\n\n用户文件：\n${fileContext}`,
        },
      ];

      // Call LLM with 10s timeout
      const responsePromise = chat(messages);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Starters generation timeout')), 10000)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);

      // Parse JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return reply.send({ starters: [] });
      }

      const starters = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(starters)) {
        return reply.send({ starters: [] });
      }

      return reply.send({ starters: starters.slice(0, 4) });
    } catch (err) {
      console.error('[conversation-starters] Failed to generate starters:', err instanceof Error ? err.message : err);
      return reply.send({ starters: [] });
    }
  });
}
