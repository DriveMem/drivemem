import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, asc, sql, isNotNull, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { conversations, messages, users, files, apiKeys, nudgeState, apiActivityLogs } from '../db/schema.js';
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function conversationRoutes(app: FastifyInstance) {
  // GET /suggestions — AI 推荐问题 (Phase 2: user segmentation + personalized)
  app.get('/suggestions', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    // --- User type detection ---
    const [apiKeyCount, nudge, apiUploadedCount, recentFiles, allFiles] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(apiKeys).where(eq(apiKeys.userId, userId)).then(r => r[0]?.count ?? 0),
      db.select({ mcpConnectAt: nudgeState.mcpConnectAt }).from(nudgeState).where(eq(nudgeState.userId, userId)).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(apiActivityLogs).where(eq(apiActivityLogs.userId, userId)).then(r => r[0]?.count ?? 0),
      db.select({ name: files.name, summary: files.summary }).from(files).where(and(eq(files.userId, userId), isNotNull(files.summary))).orderBy(desc(files.createdAt)).limit(5),
      db.select({ name: files.name }).from(files).where(eq(files.userId, userId)).limit(10),
    ]);

    const hasMcp = !!(nudge?.mcpConnectAt);
    const hasApiKeys = apiKeyCount > 0;
    const hasApiActivity = apiUploadedCount > 0;
    const isDeveloper = hasMcp || hasApiKeys || hasApiActivity;
    const userType: 'developer' | 'knowledge_manager' | 'new' = recentFiles.length === 0 && allFiles.length === 0
      ? 'new'
      : isDeveloper ? 'developer' : 'knowledge_manager';

    // --- New user: role-appropriate onboarding ---
    if (userType === 'new') {
      const hasChinese = allFiles.some(f => /[\u4e00-\u9fff]/.test(f.name));
      if (isDeveloper) {
        return reply.send({ userType, suggestions: hasChinese
          ? ['通过 MCP 同步你的代码笔记', '上传技术文档开始提问', '试试用 API 自动存储知识']
          : ['Sync your code notes via MCP', 'Upload tech docs to start asking', 'Try storing knowledge via API']
        });
      }
      return reply.send({ userType, suggestions: hasChinese
        ? ['上传文件即可开始', '试试拖拽文件到页面', '支持 PDF、Word、TXT、Markdown']
        : ['Upload a file to get started', 'Try dragging files onto the page', 'Supports PDF, Word, TXT, Markdown']
      });
    }

    // --- Has files: generate personalized suggestions ---
    const fileInfo = recentFiles.map(f => `${f.name}: ${f.summary?.substring(0, 100)}`).join('\n');

    let prompt: string;
    if (userType === 'developer') {
      prompt = `The user is a developer who uses AI Drive via MCP/API integrations. They have these files:\n${fileInfo}\n\nGenerate 3 questions a developer would ask about their knowledge base — e.g. cross-referencing docs, summarizing technical decisions, finding code-related notes. Generate questions in the same language as the majority of file names above. Requirements: each question under 60 characters, casual language, one per line, no numbering.`;
    } else {
      prompt = `The user is a knowledge manager who manually uploads documents. They have these files:\n${fileInfo}\n\nGenerate 3 questions about organizing, comparing, or extracting insights from their documents. Generate questions in the same language as the majority of file names above. Requirements: each question under 60 characters, casual language, one per line, no numbering.`;
    }

    try {
      const result = await chat([{ role: 'user', content: prompt }]);
      const suggestions = result.split('\n').filter((s: string) => s.trim()).slice(0, 3);
      return reply.send({ userType, suggestions });
    } catch {
      return reply.send({ userType, suggestions: recentFiles.map(f => `Summarize the key points of ${f.name}`) });
    }
  });

  // GET /recent — recent conversations with preview
  app.get('/recent', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;
    const limit = Math.min(Number((request.query as any).limit) || 10, 20);

    const recentConvs = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        updatedAt: conversations.updatedAt,
        createdAt: conversations.createdAt,
        isPinned: conversations.isPinned,
      })
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);

    if (recentConvs.length === 0) {
      return { conversations: [] };
    }

    // Get message counts and first user message for each conversation
    const convIds = recentConvs.map(c => c.id);
    const msgStats = await db
      .select({
        conversationId: messages.conversationId,
        messageCount: sql<number>`count(*)::int`,
        lastMessageAt: sql<string>`max(${messages.createdAt})`,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .groupBy(messages.conversationId);

    // Get first user message per conversation for preview
    const firstUserMsgs = await db
      .select({
        conversationId: messages.conversationId,
        content: messages.content,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, convIds),
          eq(messages.role, 'user')
        )
      )
      .orderBy(asc(messages.createdAt));

    // Dedupe to first per conversation
    const previewMap = new Map<string, string>();
    for (const msg of firstUserMsgs) {
      if (!previewMap.has(msg.conversationId)) {
        previewMap.set(msg.conversationId, msg.content.slice(0, 100));
      }
    }

    const statsMap = new Map(msgStats.map(s => [s.conversationId, s]));

    const result = recentConvs.map(c => {
      const stats = statsMap.get(c.id);
      const preview = previewMap.get(c.id) || '';
      const fallbackTitle = preview ? preview.slice(0, 30) + (preview.length > 30 ? '...' : '') : null;
      return {
        id: c.id,
        title: (!c.title || c.title === 'New conversation' || c.title === 'Untitled')
          ? (fallbackTitle || c.title || 'New conversation')
          : c.title,
        lastMessageAt: stats?.lastMessageAt || c.updatedAt,
        messageCount: stats?.messageCount || 0,
        previewSnippet: preview,
        isPinned: c.isPinned,
      };
    });

    return { conversations: result };
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

    // Get first user message per conversation for title fallback
    const convIds = result.map(c => c.id);
    const untitledIds = result.filter(c => !c.title || c.title === 'New conversation' || c.title === 'Untitled').map(c => c.id);
    let previewMap = new Map<string, string>();
    if (untitledIds.length > 0) {
      const firstUserMsgs = await db
        .select({ conversationId: messages.conversationId, content: messages.content })
        .from(messages)
        .where(and(inArray(messages.conversationId, untitledIds), eq(messages.role, 'user')))
        .orderBy(asc(messages.createdAt));
      for (const msg of firstUserMsgs) {
        if (!previewMap.has(msg.conversationId)) {
          const text = msg.content.trim();
          previewMap.set(msg.conversationId, text.slice(0, 30) + (text.length > 30 ? '...' : ''));
        }
      }
    }

    const enriched = result.map(c => ({
      ...c,
      title: (!c.title || c.title === 'New conversation' || c.title === 'Untitled')
        ? (previewMap.get(c.id) || c.title || 'New conversation')
        : c.title,
    }));

    return { conversations: enriched };
  });

  // GET /:id — get conversation with messages
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.status(404).send({ error: 'Not found' });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply ? reply.status(400).send({ error: "Invalid conversation ID" }) : { error: "Invalid conversation ID" };
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply ? reply.status(400).send({ error: "Invalid conversation ID" }) : { error: "Invalid conversation ID" };
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply ? reply.status(400).send({ error: "Invalid conversation ID" }) : { error: "Invalid conversation ID" };
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply ? reply.status(400).send({ error: "Invalid conversation ID" }) : { error: "Invalid conversation ID" };
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply ? reply.status(400).send({ error: "Invalid conversation ID" }) : { error: "Invalid conversation ID" };
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply ? reply.status(400).send({ error: "Invalid conversation ID" }) : { error: "Invalid conversation ID" };
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

    // Track activation action: first chat
    if (isFirstUserMessage) {
      import('../services/nudge.service.js').then(({ recordActivationAction }) => {
        recordActivationAction(user.id, 'chat_first').catch(() => {});
      }).catch(() => {});
    }

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
      (c, i) => `Source ${i + 1} (${c.fileName} chunk ${c.chunkIndex + 1}): ${c.text}`,
    );
    const systemPrompt = `You are DriveMem AI, the user's personal knowledge assistant. The user's knowledge base contains **${userFileCount} files in total**. Your job is to answer questions **strictly based on the user's uploaded documents**.

Important rules:
1. **Only use the document excerpts provided below** to answer questions. Do not supplement with your own knowledge.
2. If the excerpts **don't contain relevant information**, clearly tell the user "I couldn't find relevant content in your documents."
3. **Always cite sources using superscript numbers**: ¹ ² ³. Example: "According to document¹, the key features include..."
4. When excerpts come from **multiple files**, proactively do **cross-file analysis**: compare viewpoints, synthesize information, highlight similarities and differences.
5. **Always respond in the same language as the user's question.** If the user asks in English, respond in English. If in Chinese, respond in Chinese.
6. ${userFileCount === 0 ? 'The user has no files yet. Suggest they upload files first.' : 'Do not suggest uploading files. If search results are empty, it means no content matching the question was found.'}
7. Structure answers clearly using headings, bullet points, etc. for readability.
8. When the user sends a greeting (e.g. "hello", "hi"), respond warmly and briefly introduce what you can do. Do not cite any sources.
9. **When the user asks how many files they have or what files exist, always state the total count of ${userFileCount} files.** The document excerpts below are only a relevant subset — do NOT treat them as the complete file list.

[Document Excerpts]
${citationSources.length > 0 ? citationSources.join('\n\n') : userFileCount > 0 ? '(No relevant excerpts matched for this question)' : '(The user has not uploaded any files yet)'}`;

    // Get user memories for context
    const userMemories = await db.select({ key: schema.userMemory.key, value: schema.userMemory.value })
      .from(schema.userMemory)
      .where(eq(schema.userMemory.userId, user.id))
      .orderBy(desc(schema.userMemory.createdAt))
      .limit(10);

    const memoryContext = userMemories.length > 0
      ? `\n\n[User Memory]\nYou remember the following about this user:\n${userMemories.map(m => `- ${m.key}: ${m.value}`).join('\n')}\nNaturally incorporate this knowledge when answering. Don't explicitly say "I remember you...".`
      : '';

    // Enhance prompt for comparison queries
    const compareKeywords = ['对比', '比较', '异同', '区别', '差异', 'compare', 'vs', 'difference'];
    const isCompare = compareKeywords.some(k => body.content.toLowerCase().includes(k));
    const finalSystemPrompt = (isCompare
      ? systemPrompt + `\n\n[Comparison Mode]\nThe user is comparing files. Use this structured format:\n## 📋 Similarities\nList what the documents share in common\n## 🔍 Differences\nList where the documents differ\n## 🤝 Complementary Aspects\nAnalyze how the documents complement each other\n## 💡 Suggestions\nProvide 1-2 actionable suggestions based on the comparison`
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
            const title = 'Untitled';
            await db.update(conversations).set({ title }).where(eq(conversations.id, id));
            reply.raw.write(`event: title\ndata: ${JSON.stringify({ title })}\n\n`);
          } else {
            const titleResponse = await chat([
              { role: 'system', content: 'Generate a short title (max 6 words) for this conversation based on the user message. IMPORTANT: The title MUST be in the SAME language as the user\'s message. If the user writes in Chinese, the title must be in Chinese. If the user writes in English, the title must be in English. Output only the title, no quotes, no explanation. If the message is unclear, use the first few words.' },
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
        const suggestPrompt = `Based on this AI response, generate 3 follow-up questions in the same language as the user's message. Requirements: each under 60 chars, casual language. Return ONLY a JSON array: ["q1","q2","q3"]

Response: ${fullContent.substring(0, 300)}
User message: ${(body.content || '').substring(0, 200)}`;
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
        const memoryPrompt = `Extract key user preferences, interests, or memorable facts from this conversation. Only extract genuinely valuable information (e.g. professional domain, topics of interest, preferred response style).
If nothing worth remembering, return an empty array.
Return JSON array: [{"key":"Short Label in English","value":"Brief description in English"}]
Use natural language for keys (e.g. "Professional Domain", "Preferred Style"), not underscores or Chinese.
Return only JSON, no other text.

User: ${body.content}
AI: ${fullContent.substring(0, 300)}`;

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
