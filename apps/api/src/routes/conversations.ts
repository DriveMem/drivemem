import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversations, messages, users } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { searchSimilar } from '../services/vector.service.js';
import { embedTexts, streamChat, chat } from '../services/llm.service.js';
import { config } from '../lib/config.js';

const createSchema = z.object({
  scopeType: z.enum(['all', 'folder', 'file']),
  scopeId: z.string().uuid().optional(),
});

const messageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export default async function conversationRoutes(app: FastifyInstance) {
  // POST / — create conversation
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const user = request.user!;

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: user.id,
        scopeType: body.scopeType,
        scopeId: body.scopeId ?? null,
      })
      .returning();

    return reply.status(201).send(conversation);
  });

  // GET / — list conversations
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;

    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.updatedAt));

    return { conversations: result };
  });

  // GET /:id — get conversation with messages
  app.get('/:id', { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return { ...conversation, messages: msgs };
  });

  // DELETE /:id — delete conversation
  app.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));

    return reply.status(204).send();
  });

  // POST /:id/messages — RAG chat with SSE streaming
  app.post('/:id/messages', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const body = messageSchema.parse(request.body);

    // Verify conversation ownership
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    // Daily chat limit check
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let currentCount = dbUser.dailyChatCount;

    if (!dbUser.lastChatResetAt || dbUser.lastChatResetAt < todayUTC) {
      await db
        .update(users)
        .set({ dailyChatCount: 0, lastChatResetAt: todayUTC })
        .where(eq(users.id, user.id));
      currentCount = 0;
    }

    const dailyLimit = config.DAILY_CHAT_LIMIT;
    if (currentCount >= dailyLimit) {
      throw new AppError(ErrorCodes.DAILY_CHAT_LIMIT_EXCEEDED, 'Daily chat limit exceeded', 429);
    }

    // Save user message
    const [userMessage] = await db
      .insert(messages)
      .values({
        conversationId: id,
        role: 'user',
        content: body.content,
      })
      .returning();

    // Get all existing messages for context + title check
    const existingMsgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    const isFirstUserMessage = existingMsgs.filter((m) => m.role === 'user').length === 1;

    // Recent context (last N rounds)
    const contextRounds = config.CHAT_CONTEXT_ROUNDS;
    const recentMessages = existingMsgs.slice(-(contextRounds * 2));

    // RAG: embed query and search
    const [queryEmbedding] = await embedTexts([body.content]);
    const chunks = await searchSimilar({
      userId: user.id,
      query: queryEmbedding,
      scopeType: conversation.scopeType,
      scopeId: conversation.scopeId ?? undefined,
      limit: 6,
    });

    // Build system prompt
    const citationSources = chunks.map(
      (c, i) => `来源 ${i + 1} (${c.fileName} 第${c.chunkIndex + 1}段): ${c.text}`,
    );
    const systemPrompt = `你是一个文档 AI 助手。基于以下文档片段回答用户问题。如果文档中没有相关信息，请如实说明。

[文档片段]
${citationSources.join('\n\n')}`;

    // Build chat history for LLM
    const chatHistory = recentMessages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    // SSE response
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let fullContent = '';

    try {
      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...chatHistory,
      ];

      for await (const token of streamChat(llmMessages)) {
        fullContent += token;
        reply.raw.write(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`);
      }

      // Save assistant message with citations
      const citations = chunks.map((c) => ({
        fileId: c.fileId,
        fileName: c.fileName,
        chunkIndex: c.chunkIndex,
        text: c.text,
      }));

      const [assistantMessage] = await db
        .insert(messages)
        .values({
          conversationId: id,
          role: 'assistant',
          content: fullContent,
          citations,
        })
        .returning();

      // Increment daily chat count
      await db
        .update(users)
        .set({ dailyChatCount: sql`${users.dailyChatCount} + 1` })
        .where(eq(users.id, user.id));

      // Update conversation updatedAt
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, id));

      // Generate title on first message
      if (isFirstUserMessage) {
        try {
          const titleResponse = await chat([
            { role: 'system', content: '根据用户的第一条消息，生成一个简短的对话标题（不超过20个字），只返回标题文本，不要引号或其他格式。' },
            { role: 'user', content: body.content },
          ]);
          const title = titleResponse.slice(0, 50).trim() || body.content.slice(0, 30);
          await db.update(conversations).set({ title }).where(eq(conversations.id, id));
        } catch {
          // Fallback: use first message content as title
          const title = body.content.slice(0, 30) + (body.content.length > 30 ? '...' : '');
          await db.update(conversations).set({ title }).where(eq(conversations.id, id));
        }
      }

      reply.raw.write(
        `event: done\ndata: ${JSON.stringify({ messageId: assistantMessage.id, citations })}\n\n`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      reply.raw.write(
        `event: error\ndata: ${JSON.stringify({ code: 'LLM_ERROR', message })}\n\n`,
      );
    }

    reply.raw.end();
  });
}
