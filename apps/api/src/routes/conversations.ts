import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, asc, sql, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { conversations, messages, users, files } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { searchSimilar } from '../services/vector.service.js';
import { streamChat, chat } from '../services/llm.service.js';
import { embedTexts } from '../services/embedding.service.js';
import { config } from '../lib/config.js';
import { autoCapture } from '../services/auto-capture.js';

const createSchema = z.object({
  scopeType: z.enum(['all', 'folder', 'file']),
  scopeId: z.string().uuid().optional(),
  title: z.string().max(255).optional(),
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
      return reply.send({ suggestions: ['Upload a file to get started', 'Try dragging files onto the page', 'Supports PDF, Word, TXT, Markdown'] });
    }

    const fileInfo = recentFiles.map(f => `${f.name}: ${f.summary?.substring(0, 100)}`).join('\n');
    const prompt = `The user has these files:\n${fileInfo}\n\nGenerate 3 questions the user might want to ask about their files. Requirements: each question under 60 characters, use casual everyday language, one per line, no numbering.`;

    try {
      const result = await chat([{ role: 'user', content: prompt }]);
      const suggestions = result.split('\n').filter((s: string) => s.trim()).slice(0, 3);
      return reply.send({ suggestions });
    } catch {
      return reply.send({ suggestions: recentFiles.map(f => `Summarize the key points of ${f.name}`) });
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
        ...(body.title ? { title: body.title } : {}),
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
      .orderBy(desc(conversations.isPinned), desc(conversations.pinnedAt), desc(conversations.updatedAt));

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

  // PATCH /:id — update conversation (pin/unpin, rename)
  app.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const body = request.body as { isPinned?: boolean; title?: string };

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));

    if (!conversation) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Conversation not found', status: 404 } });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.isPinned === 'boolean') {
      updates.isPinned = body.isPinned;
      updates.pinnedAt = body.isPinned ? new Date() : null;
    }
    if (body.title) updates.title = body.title;

    const [updated] = await db.update(conversations).set(updates).where(eq(conversations.id, id)).returning();
    return reply.send(updated);
  });

  // PUT /:id/pin — pin conversation
  app.put('/:id/pin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    const [updated] = await db.update(conversations)
      .set({ isPinned: true, pinnedAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    return reply.send(updated);
  });

  // DELETE /:id/pin — unpin conversation
  app.delete('/:id/pin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    const [updated] = await db.update(conversations)
      .set({ isPinned: false, pinnedAt: null, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    return reply.send(updated);
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

    // Start SSE immediately so client knows we're working
    const origin = request.headers.origin;
    const allowedOrigins = ['https://drivemem.cloud', 'https://drivemem.cloud', 'http://localhost', 'http://localhost:3000'];
    const corsOrigin = origin && (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) ? origin : '';

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
    });

    // Send thinking event immediately
    reply.raw.write(`event: thinking\ndata: ${JSON.stringify({ status: 'searching' })}\n\n`);

    // RAG: embed query and search
    const { preprocessQuery } = await import("../services/vector.service.js");
    const processedQuery = preprocessQuery(body.content);
    const [queryEmbedding] = await embedTexts([processedQuery]);
    const chunks = await searchSimilar({
      userId: user.id,
      query: queryEmbedding,
      scopeType: conversation.scopeType,
      scopeId: conversation.scopeId ?? undefined,
      limit: 10,
    });

    // Prefer newer file versions: if a file has previousVersionId pointing to it, deprioritize the old one
    const filesWithVersions = await db.select({ id: schema.files.id, previousVersionId: schema.files.previousVersionId, archivedAt: schema.files.archivedAt })
      .from(schema.files)
      .where(eq(schema.files.userId, user.id));
    const oldVersionIds = new Set(filesWithVersions.filter(f => f.previousVersionId).map(f => f.previousVersionId));
    const archivedIds = new Set(filesWithVersions.filter(f => f.archivedAt).map(f => f.id));
    const userFileCount = filesWithVersions.filter(f => !f.archivedAt && !oldVersionIds.has(f.id)).length;
    const filteredChunks = chunks.filter(c => !oldVersionIds.has(c.fileId) && !archivedIds.has(c.fileId));
    // Fall back to original if filtering removes everything
    const finalChunks = filteredChunks.length > 0 ? filteredChunks : chunks;

    // RAG debug log
    console.log("[RAG] user=" + user.id + " chunks=" + finalChunks.length + " scores=" + JSON.stringify(finalChunks.map(c => c.score.toFixed(2))));

    // Build system prompt
    const citationSources = finalChunks.map(
      (c, i) => `来源 ${i + 1} (${c.fileName} 第${c.chunkIndex + 1}段): ${c.text}`,
    );
    const systemPrompt = `你是 AI Drive 助手，用户的个人记忆层助手。用户当前知识库中有 ${userFileCount} 个文件。你的职责是**严格基于用户上传的文档内容**回答问题。

重要规则：
1. **只使用下方提供的文档片段**来回答问题，不要使用你自己的知识补充
2. 如果文档片段中**没有相关信息**，明确告诉用户"在您的文档中没有找到相关内容"
3. 回答时**必须用上标数字引用来源**，格式：¹ ² ³。例如"根据文档¹，核心功能包括..."。不要使用 [来源: xxx] 格式
4. 当检索到**多个文件**的内容时，主动进行**跨文件分析**：对比不同文件的观点、综合多份文档的信息、指出文件间的异同
5. 使用中文回答，保持专业友好的语气
6. ${userFileCount === 0 ? '用户还没有上传任何文件，提醒用户先上传文件' : '不要提醒用户上传文件，用户已经有文件了。如果检索结果为空，说明没有找到与问题相关的内容'}
7. 回答结构清晰，使用标题、列表等格式提升可读性
8. 当用户发送问候（如"你好"、"hi"）时，友好回复并简要介绍你能做什么，不要引用任何来源

[文档片段]
${citationSources.length > 0 ? citationSources.join('\n\n') : userFileCount > 0 ? '（当前问题未匹配到相关文档片段）' : '（用户尚未上传文件）'}`;

    // Get user memories for context
    const userMemories = await db.select({ key: schema.userMemory.key, value: schema.userMemory.value })
      .from(schema.userMemory)
      .where(eq(schema.userMemory.userId, user.id))
      .orderBy(desc(schema.userMemory.createdAt))
      .limit(10);

    const memoryContext = userMemories.length > 0
      ? `\n\n[用户记忆]\n你记住了关于这个用户的以下信息：\n${userMemories.map(m => `- ${m.key}: ${m.value}`).join('\n')}\n在回答时自然地运用这些记忆，让用户感觉你了解他们。不要刻意提及"我记得你..."。`
      : '';

    // Enhance prompt for comparison queries
    const compareKeywords = ['对比', '比较', '异同', '区别', '差异', 'compare', 'vs'];
    const isCompare = compareKeywords.some(k => body.content.includes(k));
    const finalSystemPrompt = (isCompare
      ? systemPrompt + `\n\n【对比分析模式】\n用户正在进行文件对比分析。请使用以下结构化格式输出：\n## 📋 相同点\n列出两份文档的共同之处\n## 🔍 不同点\n列出两份文档的差异\n## 🤝 互补之处\n分析两份文档如何互相补充\n## 💡 建议\n基于对比结果给出 1-2 条有价值的建议`
      : systemPrompt) + memoryContext;

    // Build chat history for LLM
    const chatHistory = recentMessages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

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
      const citations = finalChunks.map((c) => ({
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
          const userContent = (body.content || '').trim();
          if (!userContent) {
            const title = 'New conversation';
            await db.update(conversations).set({ title }).where(eq(conversations.id, id));
            reply.raw.write(`event: title\ndata: ${JSON.stringify({ title })}\n\n`);
          } else {
            const titleResponse = await chat([
              { role: 'system', content: 'Generate a short title (max 6 words) for this conversation based on the user message. Output only the title, no quotes, no explanation. If the message is unclear, use the first few words.' },
              { role: 'user', content: userContent },
            ]);
            const cleaned = titleResponse.slice(0, 50).trim().replace(/^["'「」《》]+|["'「」《》]+$/g, '');
            // Reject LLM responses that look like meta-instructions rather than actual titles
            const isMetaResponse = /^(请提供|请输入|请给出|I need|Please provide)/i.test(cleaned);
            const title = (!cleaned || isMetaResponse) ? userContent.slice(0, 30) + (userContent.length > 30 ? '...' : '') : cleaned;
            await db.update(conversations).set({ title }).where(eq(conversations.id, id));
            reply.raw.write(`event: title\ndata: ${JSON.stringify({ title })}\n\n`);
          }
        } catch {
          // Fallback: use first message content as title
          const fallbackContent = (body.content || '').trim();
          const title = fallbackContent ? fallbackContent.slice(0, 30) + (fallbackContent.length > 30 ? '...' : '') : 'New conversation';
          await db.update(conversations).set({ title }).where(eq(conversations.id, id));
          reply.raw.write(`event: title\ndata: ${JSON.stringify({ title })}\n\n`);
        }
      }

      // Generate follow-up suggestions (non-blocking)
      try {
        const suggestPrompt = `基于以下AI回答，生成3个追问问题。要求：每个不超过15字，日常口语，不要学术句。只返回JSON数组：["问题1","问题2","问题3"]

AI回答：${fullContent.substring(0, 300)}`;
        const suggestResult = await chat([{ role: 'user', content: suggestPrompt }]);
        // Extract JSON array from response
        const jsonMatch = suggestResult.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]).slice(0, 3);
          reply.raw.write(`event: suggestions\ndata: ${JSON.stringify({ suggestions })}\n\n`);
        }
      } catch {
        // Non-blocking — skip suggestions on failure
      }

      // Extract user memory from conversation (non-blocking)
      try {
        const memoryPrompt = `从以下对话中提取用户的关键偏好、关注点或记忆点。只提取真正有价值的信息（如用户的专业领域、关注的话题、偏好的回答风格等）。
如果没有值得记忆的信息，返回空数组。
返回JSON数组格式：[{"key":"简短标签","value":"具体描述"}]
只返回JSON，不要其他文本。

用户问：${body.content}
AI答：${fullContent.substring(0, 300)}`;

        const memoryResult = await chat([{ role: 'user', content: memoryPrompt }]);
        const memJsonMatch = memoryResult.match(/\[[\s\S]*?\]/);
        if (memJsonMatch) {
          const memories = JSON.parse(memJsonMatch[0]);
          for (const mem of memories.slice(0, 3)) {
            if (mem.key && mem.value) {
              const existing = await db.select().from(schema.userMemory)
                .where(and(eq(schema.userMemory.userId, user.id), eq(schema.userMemory.key, mem.key)));
              if (existing.length === 0) {
                await db.insert(schema.userMemory).values({
                  userId: user.id,
                  key: mem.key,
                  value: mem.value,
                  source: id,
                });
              }
            }
          }
        }
      } catch {
        // Non-blocking
      }

      // Auto-capture knowledge every 10 messages (non-blocking)
      try {
        const totalMsgCount = existingMsgs.length;
        if (totalMsgCount >= 10 && totalMsgCount % 10 === 0) {
          const conversationText = existingMsgs
            .map(m => `${m.role}: ${m.content}`)
            .join('\n\n');
          autoCapture(user.id, conversationText, { sessionId: id }).catch(() => {});
        }
      } catch {
        // Non-blocking
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

  // POST /:convId/messages/:msgId/rating — 对话评分
  app.post('/:convId/messages/:msgId/rating', { preHandler: [requireAuth] }, async (request, reply) => {
    const { msgId } = request.params as { convId: string; msgId: string };
    const userId = request.user!.id;
    const body = request.body as { rating: string };

    if (!body.rating || !['thumbs_up', 'thumbs_down'].includes(body.rating)) {
      return reply.status(400).send({ error: 'rating must be thumbs_up or thumbs_down' });
    }

    // Upsert — same user same message overwrites
    const existing = await db.select().from(schema.messageRatings)
      .where(and(eq(schema.messageRatings.messageId, msgId), eq(schema.messageRatings.userId, userId)));

    if (existing.length > 0) {
      await db.update(schema.messageRatings)
        .set({ rating: body.rating })
        .where(eq(schema.messageRatings.id, existing[0].id));
    } else {
      await db.insert(schema.messageRatings).values({
        messageId: msgId,
        userId,
        rating: body.rating,
      });
    }

    return reply.send({ success: true, rating: body.rating });
  });
}
