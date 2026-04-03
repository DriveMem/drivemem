import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, asc, sql, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversations, messages, users, files } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { searchSimilar } from '../services/vector.service.js';
import { streamChat, chat } from '../services/llm.service.js';
import { embedTexts } from '../services/embedding.service.js';
import { config } from '../lib/config.js';

const createSchema = z.object({
  scopeType: z.enum(['all', 'folder', 'file']),
  scopeId: z.string().uuid().optional(),
});

const messageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export default async function conversationRoutes(app: FastifyInstance) {
  // GET /suggestions — AI 推荐问题
  app.get('/suggestions', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const recentFiles = await db.select({ name: files.name, summary: files.summary })
      .from(files)
      .where(and(eq(files.userId, userId), isNotNull(files.summary)))
      .orderBy(desc(files.createdAt))
      .limit(3);

    if (recentFiles.length === 0) {
      return reply.send({ suggestions: ['上传一个文件，让 AI 记住它', '试试拖拽文件到页面上传', '支持 PDF、Word、TXT、Markdown 格式'] });
    }

    const fileInfo = recentFiles.map(f => `${f.name}: ${f.summary?.substring(0, 100)}`).join('\n');
    const prompt = `用户有以下文件：\n${fileInfo}\n\n请基于这些文件内容，生成 3 个用户可能想问的问题。每行一个问题，不要编号，不要引号，直接输出问题文本。`;

    try {
      const result = await chat([{ role: 'user', content: prompt }]);
      const suggestions = result.split('\n').filter((s: string) => s.trim()).slice(0, 3);
      return reply.send({ suggestions });
    } catch {
      return reply.send({ suggestions: recentFiles.map(f => `总结一下 ${f.name} 的主要内容`) });
    }
  });

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

    // RAG debug log
    console.log("[RAG] user=" + user.id + " chunks=" + chunks.length + " scores=" + JSON.stringify(chunks.map(c => c.score.toFixed(2))));

    // Build system prompt
    const citationSources = chunks.map(
      (c, i) => `来源 ${i + 1} (${c.fileName} 第${c.chunkIndex + 1}段): ${c.text}`,
    );
    const systemPrompt = `你是 AI Drive 的文档 AI 助手。你的职责是**严格基于用户上传的文档内容**回答问题。

重要规则：
1. **只使用下方提供的文档片段**来回答问题，不要使用你自己的知识补充
2. 如果文档片段中**没有相关信息**，明确告诉用户"在您的文档中没有找到相关内容"
3. 回答时**必须引用具体来源**，格式：[来源: 文件名, 第N段]。如果信息来自多个文件，分别标注每个来源
4. 当检索到**多个文件**的内容时，主动进行**跨文件分析**：对比不同文件的观点、综合多份文档的信息、指出文件间的异同
5. 使用中文回答，保持专业友好的语气
6. 如果用户没有上传任何文件或检索结果为空，提醒用户先上传文件
7. 回答结构清晰，使用标题、列表等格式提升可读性

[文档片段]
${citationSources.length > 0 ? citationSources.join('\n\n') : '（未找到相关文档内容。请告诉用户在他们的文件中没有找到相关信息，或者提醒他们先上传文件。）'}`;

    // Enhance prompt for comparison queries
    const compareKeywords = ['对比', '比较', '异同', '区别', '差异', 'compare', 'vs'];
    const isCompare = compareKeywords.some(k => body.content.includes(k));
    const finalSystemPrompt = isCompare
      ? systemPrompt + `\n\n【对比分析模式】\n用户正在进行文件对比分析。请使用以下结构化格式输出：\n## 📋 相同点\n列出两份文档的共同之处\n## 🔍 不同点\n列出两份文档的差异\n## 🤝 互补之处\n分析两份文档如何互相补充\n## 💡 建议\n基于对比结果给出 1-2 条有价值的建议`
      : systemPrompt;

    // Build chat history for LLM
    const chatHistory = recentMessages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    // SSE response
    // Get CORS origin from request
    const origin = request.headers.origin;
    const allowedOrigins = ['https://drive.verrrnm.cloud', 'https://verrrnm.cloud', 'http://localhost', 'http://localhost:3000'];
    const corsOrigin = origin && (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) ? origin : '';

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
    });

    let fullContent = '';

    try {
      const llmMessages = [
        { role: 'system' as const, content: finalSystemPrompt },
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
            { role: 'system', content: '你是标题生成器。根据用户消息生成一个10字以内的中文短标题。规则：只输出标题本身，禁止输出解释、引号、标点、前缀。' },
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
