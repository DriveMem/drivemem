import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar, preprocessQuery } from '../services/vector.service.js';
import { chat } from '../services/llm.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { inferRole } from '../services/context-compiler/agent-profiles.js';
import type { DetectedCapabilities } from '../services/capability-detector.js';


// Proactive Context Enrichment — append related knowledge to tool responses
async function enrichResponse(userId: string, query: string, excludeFileIds: string[]): Promise<string> {
  try {
    const [vec] = await embedTexts([query]);
    const related = await searchSimilar({ userId, query: vec, scopeType: 'all', limit: 5 });
    // Filter out already-shown results and limit to 3
    const novel = related.filter(r => !excludeFileIds.includes(r.fileId)).slice(0, 3);
    if (novel.length === 0) return '';
    const lines = ['\n---\n## 💡 Related from your knowledge base'];
    for (const r of novel) {
      lines.push(`- **${r.fileName}**: ${r.text.slice(0, 200).replace(/\n/g, ' ')}`);
    }
    lines.push('\n*Use aidrive_search or aidrive_ask to explore further.*');
    return lines.join('\n');
  } catch { return ''; }
}

export interface McpServerOptions {
  onToolCall?: (toolName: string) => void;
}

export function createMcpServer(userId: string, agentName: string = '', options?: McpServerOptions): Server {
  // Track detected project across the session
  let detectedProjectId: string | null = null;
  let detectedProjectName: string | null = null;
  // Track detected capabilities across the session
  let detectedCaps: DetectedCapabilities | null = null;

  // Kick off async capability detection on connect
  import('../services/capability-detector.js').then(({ detectCapabilities }) => {
    detectCapabilities(userId, { agentName }).then(caps => {
      detectedCaps = caps;
    }).catch(() => {});
  }).catch(() => {});

  const server = new Server(
    { name: 'ai-drive', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      instructions: `You are connected to DriveMem — the user's shared knowledge base across all AI tools. You MUST use it proactively.

## CRITICAL: You must do these automatically — do NOT wait for the user to ask.

### 1. FIRST THING — Load Context (MANDATORY)
At the START of every conversation, IMMEDIATELY call aidrive_compile_context with a description of what the user seems to need. This gives you their background, recent work, and relevant knowledge. Do this BEFORE your first substantive reply.

### 2. EVERY QUESTION — Search First (MANDATORY)  
Before answering ANY question, call aidrive_search to check the knowledge base. The user expects you to already know their projects and decisions. Not searching = giving uninformed answers.

### 3. AFTER VALUABLE OUTPUT — Save It (MANDATORY)
When the conversation produces decisions, conclusions, analysis, or action items, call aidrive_store to save them. Other AI tools the user works with will automatically get access to these insights.

### 4. Citation
When using knowledge base content in your answer, mention the source file name.

## Why this matters
The user connected you to DriveMem so you can be smarter — you have access to their entire knowledge history. USE IT. Every conversation should start with context loading and end with knowledge saving.

## Available Context Tools
- aidrive_compile_context: Get a compiled briefing for the current task (recommended on session start)
- aidrive_search: Semantic search across all files
- aidrive_ask: RAG Q&A with cited sources
- aidrive_store: Save knowledge back to the library

You are not just a chat assistant — you are part of the user's knowledge system. Every conversation should make the knowledge base richer, and every new session should benefit from past knowledge.`,
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'aidrive_search',
        description: '在用户的个人知识库中进行语义搜索。适用场景:查找历史决策和结论、对比不同文件的观点、验证数据一致性、寻找相关资料辅助写作、回忆之前讨论过的话题。支持自然语言查询,返回最相关的文件片段和相似度分数。当你需要参考用户已有知识时,优先使用此工具。',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: '搜索关键词或问题' },
            contextBudget: { type: 'number', description: '返回内容的 token 预算（默认完整返回）。小模型传 2000，大模型传 50000' },
            preferFormat: { type: 'string', description: '返回格式：text(自然语言,默认) | structured(JSON) | summary(要点列表)', enum: ['text', 'structured', 'summary'] },
          },
          required: ['query'],
        },
      },
      {
        name: 'aidrive_ask',
        description: '基于用户知识库中的所有文件回答问题(RAG 问答)。AI 会检索最相关的文档片段并生成有引用来源的回答。适用场景:需要基于用户文件给出准确回答、做跨文件综合分析、回答需要事实依据的问题。与 search 的区别:search 返回原始片段,ask 返回 AI 理解后的结构化回答。',
        inputSchema: {
          type: 'object' as const,
          properties: {
            question: { type: 'string', description: '要问的问题' },
            contextBudget: { type: 'number', description: '回答的 token 预算。小模型传 500，大模型传 5000' },
            preferFormat: { type: 'string', description: '回答格式：text(自然语言,默认) | structured(JSON) | summary(要点列表)', enum: ['text', 'structured', 'summary'] },
          },
          required: ['question'],
        },
      },
      {
        name: 'aidrive_list_files',
        description: '列出用户知识库中的所有文件,包含文件名、类型、状态和 AI 自动生成的摘要。适用场景:了解用户知识库全貌、查看有哪些可用资料、检查文件索引状态、获取文件 ID 用于后续操作。建议在使用 search 或 ask 之前先调用此工具了解知识库内容。',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'aidrive_get_insights',
        description: '获取 AI 主动发现的知识洞察--文件之间的关联、矛盾观点和共同趋势。这些洞察由 AI 在文件索引时自动生成,无需用户提问。适用场景:发现用户可能没注意到的知识联系、找出文档间的矛盾点、识别跨文件的共同趋势、为用户提供知识库的全局视角。',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'aidrive_file_detail',
        description: '获取某个文件的详细信息,包括 AI 自动生成的摘要、文件类型、状态等。适用场景:深入了解某个特定文件的内容、获取 AI 对文件的理解、在搜索到文件后查看详情。需要文件 ID(可通过 list_files 获取)。',
        inputSchema: {
          type: 'object' as const,
          properties: {
            fileId: { type: 'string', description: '文件 ID' },
            detail: { type: 'string', description: 'brief(默认)或 full', enum: ['brief', 'full'] },
            contextBudget: { type: 'number', description: 'token 预算，自动决定返回 brief 还是 full' },
            preferFormat: { type: 'string', description: '返回格式：text | structured | summary', enum: ['text', 'structured', 'summary'] },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'aidrive_suggest_workflow',
        description: '根据用户知识库的当前内容,AI 主动建议 3-5 个可以执行的操作或分析方向。当你不确定知识库能做什么、或想帮用户发现知识价值时调用。常见建议:对比两份文件观点、生成分析报告、检查数据一致性、发现知识盲点等。',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'aidrive_timeline',
        description: '查看用户知识库的活动时间线——包括文件上传、AI 对话、AI 洞察发现、报告生成等所有活动。适用场景：了解用户最近做了什么、知识库有什么变化、追踪知识积累过程。',
        inputSchema: {
          type: 'object' as const,
          properties: {
            limit: { type: 'number', description: '返回条数（默认 20）' },
          },
        },
      },
      {
        name: 'aidrive_upload_file',
        description: '上传文件到用户的 AI Drive 知识库。上传后 AI 会自动解析、生成摘要、发现知识关联。适用场景:agent 想把工作产出物(报告、笔记、分析结果)存入知识库供后续检索和问答。',
        inputSchema: {
          type: 'object' as const,
          properties: {
            filename: { type: 'string', description: '文件名(如 report.md)' },
            content: { type: 'string', description: '文件内容(纯文本或 Markdown)' },
          },
          required: ['filename', 'content'],
        },
      },
      {
        name: 'aidrive_update_file',
        description: '更新文件属性（重命名、标签）',
        inputSchema: {
          type: 'object' as const,
          properties: {
            fileId: { type: 'string', description: '文件 ID' },
            name: { type: 'string', description: '新文件名' },
            tags: { type: 'string', description: '逗号分隔的标签' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'aidrive_batch',
        description: '批量文件操作',
        inputSchema: {
          type: 'object' as const,
          properties: {
            action: { type: 'string', enum: ['delete', 'archive', 'unarchive'], description: '操作类型' },
            fileIds: { type: 'string', description: '逗号分隔的文件ID' },
          },
          required: ['action', 'fileIds'],
        },
      },
      {
        name: 'aidrive_store',
        description: '快速存入一段知识到 AI Drive。不需要文件名，自动创建笔记。适用场景：agent 工作中发现的结论、做出的决策、重要的对话摘要、需要记住的信息。比 upload_file 更轻量——直接传内容就存入。',
        inputSchema: {
          type: 'object' as const,
          properties: {
            content: { type: 'string', description: '要存入的知识内容' },
            title: { type: 'string', description: '标题（可选，自动从内容生成）' },
            tags: { type: 'string', description: '标签（可选，逗号分隔，如 decision,meeting）' },
          },
          required: ['content'],
        },
      },
      {
        name: 'aidrive_capture_conversation',
        description: '自动捕获当前对话中的关键结论和决策，提取摘要存入知识库。当对话产生了有价值的分析、决定或发现时调用此工具。AI Drive 会自动提取要点、打标签、关联到相关文件。',
        inputSchema: {
          type: 'object' as const,
          properties: {
            summary: { type: 'string', description: '对话中的关键结论或决策摘要' },
            context: { type: 'string', description: '相关上下文（可选，如讨论了什么主题）' },
            tags: { type: 'string', description: '标签（可选，逗号分隔）' },
          },
          required: ['summary'],
        },
      },
      {
        name: 'aidrive_identity',
        description: 'Get user identity and profile (name, email, role, goals, preferences)',
        inputSchema: { type: 'object' as const, properties: {}, required: [] },
      },
      {
        name: 'aidrive_compile_context',
        description: 'Compile task-relevant context from knowledge base. Returns structured markdown optimized for the target model.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            task: { type: 'string', description: 'Current task description' },
            tokenBudget: { type: 'number', description: 'Max output tokens (default 8000)' },
            model: { type: 'string', description: 'Target model name (e.g. claude-opus, gpt-4o)' },
            project: { type: 'string', description: 'Project scope filter' },
            tags: { type: 'string', description: 'Tag filter (comma-separated)' },
            recency: { type: 'string', description: 'Time range preference (e.g. 7d, 30d)' },
          },
          required: ['task'],
        },
      },
      {
        name: 'aidrive_context_packet',
        description: '生成项目的交接包——将项目的文件、决策、进展打包成精炼的上下文摘要，用于跨模型/跨 agent 任务接力',
        inputSchema: {
          type: 'object' as const,
          properties: {
            folderId: { type: 'string', description: '文件夹/项目 ID' },
            format: { type: 'string', enum: ['markdown', 'json'], description: '输出格式，默认 markdown' },
          },
          required: ['folderId'],
        },
      },
      {
        name: 'aidrive_auto_capture',
        description: 'Automatically extract and save valuable knowledge from a conversation or text. Extracts decisions, conclusions, preferences, action items.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            content: { type: 'string', description: 'Conversation or text to extract knowledge from' },
            sessionId: { type: 'string', description: 'Optional session ID for source tracking' },
          },
          required: ['content'],
        },
      },
    ],
  }));

  // Handle tool calls
  // Track if we've already injected the welcome brief for this session
  let welcomeBriefInjected = false;

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Notify session activity tracker
    options?.onToolCall?.(name);

    // Build welcome brief on first tool call (any tool except compile_context)
    let welcomeBrief = '';
    if (!welcomeBriefInjected && name !== 'aidrive_compile_context') {
      welcomeBriefInjected = true;
      try {
        const lines: string[] = ['📚 **DriveMem Knowledge Overview**'];

        // File count + recent files (top 3)
        const [fileStats] = await db.select({ count: sql`count(*)` }).from(schema.files).where(eq(schema.files.userId, userId));
        const totalFiles = Number(fileStats?.count || 0);
        lines.push(`Total files: ${totalFiles}`);

        const recentFiles = await db.select({ name: schema.files.name, summary: schema.files.summary })
          .from(schema.files).where(eq(schema.files.userId, userId))
          .orderBy(desc(schema.files.createdAt)).limit(3);
        if (recentFiles.length > 0) {
          lines.push('\n**Recent uploads:**');
          for (const f of recentFiles) {
            const summary = f.summary ? ` — ${f.summary.slice(0, 80)}` : '';
            lines.push(`- ${f.name}${summary}`);
          }
        }

        // Recent activity (top 2)
        try {
          const { fetchTimeline } = await import('../routes/timeline.js');
          const timeline = await fetchTimeline(userId, 2);
          if (timeline.events.length > 0) {
            lines.push('\n**Recent activity:**');
            for (const e of timeline.events) {
              const date = new Date(e.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
              lines.push(`- ${e.icon} [${date}] ${e.title}`);
            }
          }
        } catch {}

        // Suggested questions based on recent file content
        if (recentFiles.length > 0) {
          const fileNames = recentFiles.map(f => f.name);
          const summaries = recentFiles.map(f => f.summary).filter(Boolean);
          const suggestions: string[] = [];
          if (summaries.length > 0) {
            suggestions.push(`Search your knowledge: try aidrive_search with topics from "${fileNames[0]}"`);
          }
          if (totalFiles > 1) {
            suggestions.push(`Ask across files: try aidrive_ask "What are the key decisions documented in my knowledge base?"`);
          }
          if (suggestions.length > 0) {
            lines.push('\n**💡 Suggested actions:**');
            suggestions.forEach(s => lines.push(`- ${s}`));
          }
        }

        lines.push('\n---');
        welcomeBrief = lines.join('\n');
      } catch { /* don't break tool calls if welcome brief fails */ }
    }

    try {
      let toolResult = await (async () => {
      switch (name) {
        case 'aidrive_search': {
          const query = (args as any).query as string;
          const budget = ((args as any).contextBudget as number) || 0;
          const format = ((args as any).preferFormat as string) || 'text';

          // Auto-detect project if not yet detected
          if (!detectedProjectId && query.length > 10) {
            try {
              const { detectProject } = await import('../services/project-detector.js');
              const detection = await detectProject(userId, { content: query, apiKeyId: undefined });
              if (detection.projectId) {
                detectedProjectId = detection.projectId;
                detectedProjectName = detection.projectName;
              }
            } catch { /* don't block on detection failure */ }
          }

          const [queryVec] = await embedTexts([preprocessQuery(query)]);
          let results = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: budget && budget < 3000 ? 3 : 5 });

          // Boost project-scoped results
          if (detectedProjectId && results.length > 0) {
            const resultFileIds = [...new Set(results.map(r => r.fileId))];
            const fileRecords = await db.select({ id: schema.files.id, folderId: schema.files.folderId })
              .from(schema.files)
              .where(inArray(schema.files.id, resultFileIds));
            const fileFolderMap: Record<string, string | null> = {};
            fileRecords.forEach(f => { fileFolderMap[f.id] = f.folderId; });
            results = results.map(r => ({
              ...r,
              score: fileFolderMap[r.fileId] === detectedProjectId ? r.score * 1.2 : r.score,
            }));
            results.sort((a, b) => b.score - a.score);
          }

          // Apply feedback weights
          const { applyFeedbackWeights } = await import('../services/feedback-weights.js');
          results = await applyFeedbackWeights(userId, results);

          const fileIds = [...new Set(results.map(r => r.fileId))];
          const fileDates: Record<string, string> = {};
          for (const fid of fileIds) {
            const [f] = await db.select({ id: schema.files.id, createdAt: schema.files.createdAt }).from(schema.files).where(eq(schema.files.id, fid));
            if (f) fileDates[f.id] = f.createdAt.toISOString().slice(0, 10);
          }

          if (format === 'structured') {
            const jsonData = results.map(r => ({ fileName: r.fileName, fileId: r.fileId, score: r.score, text: r.text.slice(0, 500), createdAt: fileDates[r.fileId] }));
            return { content: [{ type: 'text' as const, text: JSON.stringify(jsonData, null, 2) }] };
          }
          if (format === 'summary') {
            const summaryText = results.map((r, i) => `${i + 1}. ${r.fileName} (${r.score.toFixed(2)}) — ${r.text.slice(0, 80).replace(/\n/g, ' ')}`).join('\n');
            return { content: [{ type: 'text' as const, text: summaryText || '未找到。' }] };
          }

          const charsPerResult = budget ? Math.min(Math.floor((budget * 4) / Math.max(results.length, 1)), 2000) : 600;
          const text = results.map((r, i) =>
            `${i + 1}. [${r.fileName}] (score: ${r.score.toFixed(2)}, ${fileDates[r.fileId] || '?'})\n${r.text.slice(0, charsPerResult)}`
          ).join('\n\n');
          const searchEnrich = await enrichResponse(userId, query, fileIds);
          return { content: [{ type: 'text' as const, text: (text || 'No results found.') + searchEnrich }] };
        }

        case 'aidrive_ask': {
          const question = (args as any).question as string;
          const budget = ((args as any).contextBudget as number) || 0;
          const format = ((args as any).preferFormat as string) || 'text';

          // Auto-detect project if not yet detected
          if (!detectedProjectId && question.length > 10) {
            try {
              const { detectProject } = await import('../services/project-detector.js');
              const detection = await detectProject(userId, { content: question, apiKeyId: undefined });
              if (detection.projectId) {
                detectedProjectId = detection.projectId;
                detectedProjectName = detection.projectName;
              }
            } catch { /* don't block on detection failure */ }
          }

          const [queryVec] = await embedTexts([preprocessQuery(question)]);
          let chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: budget && budget < 2000 ? 3 : 6 });

          // Boost project-scoped chunks
          if (detectedProjectId && chunks.length > 0) {
            const chunkFileIds = [...new Set(chunks.map(c => c.fileId))];
            const fileRecords = await db.select({ id: schema.files.id, folderId: schema.files.folderId })
              .from(schema.files)
              .where(inArray(schema.files.id, chunkFileIds));
            const fileFolderMap: Record<string, string | null> = {};
            fileRecords.forEach(f => { fileFolderMap[f.id] = f.folderId; });
            chunks = chunks.map(c => ({
              ...c,
              score: fileFolderMap[c.fileId] === detectedProjectId ? c.score * 1.2 : c.score,
            }));
            chunks.sort((a, b) => b.score - a.score);
          }

          // Apply feedback weights
          {
            const { applyFeedbackWeights } = await import('../services/feedback-weights.js');
            chunks = await applyFeedbackWeights(userId, chunks);
          }

          const chunkChars = budget ? Math.min(Math.floor((budget * 2) / Math.max(chunks.length, 1)), 1000) : 500;
          const citations = chunks.map((c, i) => `来源 ${i + 1} (${c.fileName}): ${c.text.slice(0, chunkChars)}`).join('\n\n');
          const lengthHint = budget && budget < 1000 ? `\n请简洁回答，控制在 ${budget} 字以内。` : '';
          const formatHint = format === 'summary' ? '\n用要点列表（bullet points）回答，每点一行。' : format === 'structured' ? '\n用 JSON 格式回答：{"answer":"...","keyPoints":["..."],"confidence":"high/medium/low"}' : '';
          const systemPrompt = `你是 AI Drive AI，用户的个人知识助手。严格基于文档内容回答。用上标¹²³引用来源。${lengthHint}${formatHint}\n\n[文档片段]\n${citations || '(未找到相关文档)'}`;
          const answer = await chat([{ role: 'system', content: systemPrompt }, { role: 'user', content: question }]);
          const askFileIds = [...new Set(chunks.map(c => c.fileId))];
          const askEnrich = await enrichResponse(userId, question, askFileIds);
          return { content: [{ type: 'text' as const, text: answer + askEnrich }] };
        }

        case 'aidrive_list_files': {
          const files = await db.select({
            id: schema.files.id, name: schema.files.name, mimeType: schema.files.mimeType,
            status: schema.files.status, summary: schema.files.summary, createdAt: schema.files.createdAt,
          }).from(schema.files).where(eq(schema.files.userId, userId)).orderBy(desc(schema.files.createdAt));
          const text = files.map(f => `- ${f.name} (${f.mimeType}, ${f.status})\n  摘要: ${f.summary?.slice(0, 100) || '无'}`).join('\n');
          return { content: [{ type: 'text' as const, text: text || '知识库为空。' }] };
        }

        case 'aidrive_get_insights': {
          const insights = await db.select().from(schema.insights)
            .where(eq(schema.insights.userId, userId)).orderBy(desc(schema.insights.createdAt)).limit(10);
          if (insights.length === 0) return { content: [{ type: 'text' as const, text: '暂无 AI 洞察。上传更多文件后 AI 会自动发现关联。' }] };
          const fileIds = [...new Set(insights.flatMap(i => [i.sourceFileId, i.relatedFileId]))];
          const fileNames: Record<string, string> = {};
          for (const fid of fileIds) {
            const [f] = await db.select({ id: schema.files.id, name: schema.files.name }).from(schema.files).where(eq(schema.files.id, fid));
            if (f) fileNames[f.id] = f.name;
          }
          const text = insights.map(i =>
            `💡 ${i.title}\n  ${fileNames[i.sourceFileId] || '?'} ↔ ${fileNames[i.relatedFileId] || '?'}\n  ${i.description}`
          ).join('\n\n');
          return { content: [{ type: 'text' as const, text }] };
        }

        case 'aidrive_file_detail': {
          const fileId = (args as any).fileId as string;
          const budget = ((args as any).contextBudget as number) || 0;
          const detail = ((args as any).detail as string) || (budget && budget < 1000 ? 'brief' : 'brief');
          const [file] = await db.select().from(schema.files).where(eq(schema.files.id, fileId));
          if (!file || file.userId !== userId) return { content: [{ type: 'text' as const, text: '文件不存在。' }] };

          if (detail === 'brief') {
            const text = `文件: ${file.name}\n类型: ${file.mimeType}\n状态: ${file.status}\n大小: ${Number(file.size)} bytes\n摘要: ${file.summary?.slice(0, 200) || '无'}\n创建: ${file.createdAt}`;
            return { content: [{ type: 'text' as const, text }] };
          }

          let fullText = `文件: ${file.name}\n类型: ${file.mimeType}\n状态: ${file.status}\n大小: ${Number(file.size)} bytes\n创建: ${file.createdAt}\n\n摘要:\n${file.summary || '无'}`;
          if (file.status === 'indexed' && file.summary) {
            const [queryVec] = await embedTexts([file.summary.substring(0, 100)]);
            const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'file', scopeId: fileId, limit: 3 });
            if (chunks.length > 0) {
              fullText += '\n\n关键片段:\n' + chunks.map((c, i) => `[${i + 1}] ${c.text.slice(0, 500)}`).join('\n\n');
            }
          }
          return { content: [{ type: 'text' as const, text: fullText }] };
        }

        case 'aidrive_suggest_workflow': {
          const files = await db.select({ name: schema.files.name, summary: schema.files.summary, mimeType: schema.files.mimeType })
            .from(schema.files).where(eq(schema.files.userId, userId)).orderBy(desc(schema.files.createdAt)).limit(10);
          if (files.length === 0) return { content: [{ type: 'text' as const, text: '知识库为空。上传文件后 AI 会自动分析并生成操作建议。' }] };

          const links = await db.select({ description: schema.knowledgeLinks.description, relationType: schema.knowledgeLinks.relationType })
            .from(schema.knowledgeLinks).where(eq(schema.knowledgeLinks.userId, userId)).limit(5);
          const existingInsights = await db.select({ title: schema.insights.title })
            .from(schema.insights).where(eq(schema.insights.userId, userId)).limit(5);

          const fileSummaries = files.map(f => `- ${f.name} (${f.mimeType}): ${f.summary?.slice(0, 120) || '无摘要'}`).join('\n');
          const linkInfo = links.length > 0 ? '\n\n文件间已知关联:\n' + links.map(l => `- ${l.relationType}: ${l.description}`).join('\n') : '';
          const insightInfo = existingInsights.length > 0 ? '\n\nAI 已发现的洞察:\n' + existingInsights.map(i => `- ${i.title}`).join('\n') : '';

          const prompt = `用户知识库有 ${files.length} 个文件:\n${fileSummaries}${linkInfo}${insightInfo}\n\n基于以上具体文件内容和关联,建议 3-5 个**具体可执行的操作**。要求:\n1. 每条建议必须提到具体文件名\n2. 建议要有实际价值(如"对比《X》和《Y》的市场定位差异"),不要泛泛而谈\n3. 混合不同类型:有分析类、有整理类、有探索类\n4. 格式:emoji + 具体建议(一行一条)`;
          const suggestions = await chat([{ role: 'user', content: prompt }]);
          return { content: [{ type: 'text' as const, text: suggestions }] };
        }

        case 'aidrive_timeline': {
          const limit = ((args as any).limit as number) || 20;
          const { fetchTimeline } = await import('../routes/timeline.js');
          const data = await fetchTimeline(userId, limit);
          if (data.events.length === 0) return { content: [{ type: 'text' as const, text: '暂无活动记录。上传文件或与 AI 对话后会出现活动。' }] };
          const text = data.events.map((e: any) => {
            const date = new Date(e.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const desc = e.description ? ` — ${e.description.slice(0, 60)}` : '';
            return `${e.icon} [${date}] ${e.title}${desc}`;
          }).join('\n');
          return { content: [{ type: 'text' as const, text: `最近 ${data.events.length} 条活动：\n\n${text}${data.hasMore ? '\n\n（还有更多活动）' : ''}` }] };
        }

        case 'aidrive_upload_file': {
          const filename = (args as any).filename as string;
          const content = (args as any).content as string;
          if (!filename || !content) return { content: [{ type: 'text' as const, text: '需要 filename 和 content 参数。' }], isError: true };

          const { randomUUID } = await import('crypto');
          const fileId = randomUUID();
          const s3Key = `users/${userId}/files/${fileId}/${filename}`;
          const buffer = Buffer.from(content, 'utf-8');
          const mimeType = filename.endsWith('.md') ? 'text/markdown' : 'text/plain';

          const { uploadObject } = await import('../services/s3.service.js');
          await uploadObject(s3Key, buffer, mimeType);

          await db.insert(schema.files).values({
            id: fileId, name: filename, originalName: filename,
            mimeType, size: buffer.length, status: 'parsing', userId, s3Key,
          });

          const { Queue } = await import('bullmq');
          const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
          await queue.add('parse', { fileId, userId, s3Key, mimeType });
          await queue.close();

          return { content: [{ type: 'text' as const, text: `✅ 已上传「${filename}」到知识库。AI 正在解析和索引,稍后可搜索和问答。` }] };
        }

        case 'aidrive_store': {
          const content = (args as any).content as string;
          if (!content) return { content: [{ type: 'text' as const, text: '需要 content 参数。' }], isError: true };

          const title = ((args as any).title as string) || content.slice(0, 30).replace(/\n/g, ' ');
          const tagStr = (args as any).tags as string || '';
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `note-${timestamp}.md`;

          const mdContent = `# ${title}\n\n${content}\n\n---\n_存入时间: ${new Date().toLocaleString('zh-CN')}_`;

          const { randomUUID } = await import('crypto');
          const fileId = randomUUID();
          const s3Key = `users/${userId}/files/${fileId}/${filename}`;
          const buffer = Buffer.from(mdContent, 'utf-8');

          const { uploadObject } = await import('../services/s3.service.js');
          await uploadObject(s3Key, buffer, 'text/markdown');

          await db.insert(schema.files).values({
            id: fileId, name: filename, originalName: filename,
            mimeType: 'text/markdown', size: buffer.length, status: 'parsing', userId, s3Key,
            ...(detectedProjectId ? { folderId: detectedProjectId } : {}),
          });

          const { Queue } = await import('bullmq');
          const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
          await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
          await queue.close();

          if (tagStr) {
            const tagNames = tagStr.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3);
            const tagColors: Record<string, string> = {
              decision: '#F59E0B', meeting: '#8B5CF6', note: '#A855F7',
              research: '#EC4899', report: '#10B981', spec: '#3B82F6',
            };
            for (const tagName of tagNames) {
              try {
                let [existingTag] = await db.select().from(schema.tags)
                  .where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, tagName)));
                if (!existingTag) {
                  [existingTag] = await db.insert(schema.tags).values({
                    name: tagName, color: tagColors[tagName] || '#6B7280', userId,
                  }).returning();
                }
                if (existingTag) {
                  await db.insert(schema.fileTags).values({ fileId, tagId: existingTag.id });
                }
              } catch { /* skip */ }
            }
          }

          return { content: [{ type: 'text' as const, text: `✅ 已存入「${title}」到知识库。AI 正在理解内容，稍后可搜索和问答。` }] };
        }

        case 'aidrive_capture_conversation': {
          const summary = (args as any).summary as string;
          if (!summary) return { content: [{ type: 'text' as const, text: '需要 summary 参数。' }], isError: true };

          const context = (args as any).context as string || '';
          const tagStr = (args as any).tags as string || 'conversation';
          const title = summary.slice(0, 40).replace(/\n/g, ' ');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `capture-${timestamp}.md`;
          const mdContent = `# ${title}\n\n${summary}${context ? `\n\n## 上下文\n${context}` : ''}\n\n---\n_自动捕获: ${new Date().toLocaleString('zh-CN')}_`;

          const { randomUUID } = await import('crypto');
          const fileId = randomUUID();
          const s3Key = `users/${userId}/files/${fileId}/${filename}`;
          const buffer = Buffer.from(mdContent, 'utf-8');

          const { uploadObject } = await import('../services/s3.service.js');
          await uploadObject(s3Key, buffer, 'text/markdown');

          await db.insert(schema.files).values({
            id: fileId, name: filename, originalName: filename,
            mimeType: 'text/markdown', size: buffer.length, status: 'parsing', userId, s3Key,
          });

          const { Queue } = await import('bullmq');
          const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
          await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
          await queue.close();

          // Auto-tag as conversation capture
          try {
            let [tag] = await db.select().from(schema.tags).where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, 'conversation')));
            if (!tag) [tag] = await db.insert(schema.tags).values({ name: 'conversation', color: '#8B5CF6', userId }).returning();
            if (tag) await db.insert(schema.fileTags).values({ fileId, tagId: tag.id });
          } catch { /* skip */ }

          return { content: [{ type: 'text' as const, text: `✅ 对话结论已自动捕获：「${title}」。知识库已更新。` }] };
        }

        case 'aidrive_update_file': {
          const fileId = (args as any).fileId as string;
          if (!fileId) return { content: [{ type: 'text' as const, text: '需要 fileId 参数。' }], isError: true };
          const [file] = await db.select().from(schema.files).where(eq(schema.files.id, fileId));
          if (!file || file.userId !== userId) return { content: [{ type: 'text' as const, text: '文件不存在。' }], isError: true };

          const newName = (args as any).name as string | undefined;
          const tagStr = (args as any).tags as string | undefined;

          if (newName) {
            if (!newName.trim()) return { content: [{ type: 'text' as const, text: '名称不能为空。' }], isError: true };
            await db.update(schema.files).set({ name: newName.trim(), updatedAt: new Date() }).where(eq(schema.files.id, fileId));
          }

          if (tagStr !== undefined) {
            await db.delete(schema.fileTags).where(eq(schema.fileTags.fileId, fileId));
            const tagNames = tagStr.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10);
            const tagColors: Record<string, string> = { decision: '#F59E0B', meeting: '#8B5CF6', note: '#A855F7', research: '#EC4899', report: '#10B981', spec: '#3B82F6' };
            for (const tn of tagNames) {
              let [existing] = await db.select().from(schema.tags).where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, tn)));
              if (!existing) {
                [existing] = await db.insert(schema.tags).values({ name: tn, color: tagColors[tn] || '#6B7280', userId }).returning();
              }
              if (existing) await db.insert(schema.fileTags).values({ fileId, tagId: existing.id });
            }
          }

          const changes = [newName ? `重命名为「${newName.trim()}」` : '', tagStr !== undefined ? `标签已更新` : ''].filter(Boolean).join('，');
          return { content: [{ type: 'text' as const, text: `✅ 文件已更新：${changes}` }] };
        }

        case 'aidrive_batch': {
          const action = (args as any).action as string;
          const fileIdsStr = (args as any).fileIds as string;
          if (!action || !fileIdsStr) return { content: [{ type: 'text' as const, text: '需要 action 和 fileIds 参数。' }], isError: true };
          if (!['delete', 'archive', 'unarchive'].includes(action)) return { content: [{ type: 'text' as const, text: 'action 必须是 delete/archive/unarchive。' }], isError: true };

          const fileIds = fileIdsStr.split(',').map(s => s.trim()).filter(Boolean);
          if (fileIds.length > 50) return { content: [{ type: 'text' as const, text: '最多 50 个文件。' }], isError: true };

          let ok = 0, fail = 0;
          for (const fid of fileIds) {
            try {
              const [f] = await db.select().from(schema.files).where(and(eq(schema.files.id, fid), eq(schema.files.userId, userId)));
              if (!f) { fail++; continue; }
              if (action === 'delete') await db.delete(schema.files).where(eq(schema.files.id, fid));
              else if (action === 'archive') await db.update(schema.files).set({ archivedAt: new Date() }).where(eq(schema.files.id, fid));
              else await db.update(schema.files).set({ archivedAt: null }).where(eq(schema.files.id, fid));
              ok++;
            } catch { fail++; }
          }
          return { content: [{ type: 'text' as const, text: `✅ 批量${action}完成：成功 ${ok}，失败 ${fail}` }] };
        }

        case 'aidrive_compile_context': {
          const task = (args as any).task as string;
          if (!task) return { content: [{ type: 'text' as const, text: '需要 task 参数。' }], isError: true };
          const { compileContext } = await import('../services/context-compiler/index.js');
          const result = await compileContext(userId, {
            task,
            tokenBudget: (args as any).tokenBudget as number | undefined,
            model: (args as any).model ? { name: (args as any).model as string } : undefined,
            role: detectedCaps?.role || inferRole(agentName),
            hints: {
              project: (args as any).project as string | undefined,
              tags: (args as any).tags ? ((args as any).tags as string).split(',').map((t: string) => t.trim()) : undefined,
              recency: (args as any).recency as string | undefined,
            },
          });
          const summary = `${result.compiledContext}\n\n---\n_Compilation: ${result.metadata.fragmentCount} fragments, ${result.metadata.totalTokens}/${result.metadata.tokenBudget} tokens, ${result.metadata.compilationTimeMs}ms, coverage: ${result.metadata.coverage}_`;
          return { content: [{ type: 'text' as const, text: summary }] };
        }

        case 'aidrive_context_packet': {
          const folderId = (args as any).folderId as string;
          if (!folderId) return { content: [{ type: 'text' as const, text: '需要 folderId 参数。' }], isError: true };
          const format = ((args as any).format as string) || 'markdown';

          // Get files in folder
          const folderFiles = await db.select({
            id: schema.files.id, name: schema.files.name, summary: schema.files.summary,
          }).from(schema.files).where(and(
            eq(schema.files.userId, userId),
            eq(schema.files.folderId, folderId),
          )).orderBy(desc(schema.files.createdAt));

          if (folderFiles.length === 0) return { content: [{ type: 'text' as const, text: '该文件夹下没有文件。' }], isError: true };

          // Get folder info for project context
          const [folderInfo] = await db.select()
            .from(schema.folders)
            .where(and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId)));

          const fileIds = folderFiles.map(f => f.id);

          // Get related insights
          const { sql: sqlTag } = await import('drizzle-orm');
          const relatedInsights = await db.select({ title: schema.insights.title, description: schema.insights.description })
            .from(schema.insights)
            .where(and(
              eq(schema.insights.userId, userId),
              sqlTag`(${schema.insights.sourceFileId} IN (${sqlTag.join(fileIds.map(id => sqlTag`${id}`), sqlTag`,`)}) OR ${schema.insights.relatedFileId} IN (${sqlTag.join(fileIds.map(id => sqlTag`${id}`), sqlTag`,`)}))`,
            )).limit(20);

          const filesSection = folderFiles.map(f => `- ${f.name}: ${f.summary || '无摘要'}`).join('\n');
          const insightsSection = relatedInsights.length > 0
            ? relatedInsights.map(i => `- ${i.title}: ${i.description}`).join('\n') : '无';

          const prompt = `你是一个 AI 知识助手。请基于以下项目文件和 AI 洞察，生成一份精炼的项目交接包。

## 项目信息
名称: ${folderInfo?.name || '未知'}
简介: ${folderInfo?.brief || '未设置'}
状态: ${folderInfo?.status || '进行中'}
目标: ${folderInfo?.goal || '未设置'}

## 项目文件
${filesSection}

## AI 发现的关联
${insightsSection}

请生成以下格式的交接包：
# 项目概要
（一句话描述项目）

## 当前状态
（项目做到哪了）

## 关键决策
（已做出的重要决定）

## 待解决问题
（还没解决的问题）

## 关键文件
（最重要的几个文件及其摘要）

## 建议下一步
（下一步应该做什么）`;

          const packet = await chat([{ role: 'user', content: prompt }]);

          if (format === 'json') {
            const sections: Record<string, string> = {};
            const sectionRegex = /^#{1,2}\s+(.+)$/gm;
            const parts = packet.split(sectionRegex);
            for (let i = 1; i < parts.length; i += 2) {
              sections[parts[i].trim()] = (parts[i + 1] || '').trim();
            }
            return { content: [{ type: 'text' as const, text: JSON.stringify({ folderId, fileCount: folderFiles.length, insightCount: relatedInsights.length, packet: sections }, null, 2) }] };
          }

          return { content: [{ type: 'text' as const, text: packet }] };
        }

        case 'aidrive_auto_capture': {
          const content = (args as any).content as string;
          if (!content) return { content: [{ type: 'text' as const, text: 'content parameter required.' }], isError: true };
          const { autoCapture } = await import('../services/auto-capture.js');
          const result = await autoCapture(userId, content, { sessionId: (args as any).sessionId });
          const text = result.captured > 0
            ? `Auto-captured ${result.captured} knowledge items:\n${result.items.map(i => `- ${i.title}`).join('\n')}`
            : 'No valuable knowledge found to capture.';
          return { content: [{ type: 'text' as const, text }] };
        }

                default:
          return { content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }], isError: true };
      }
      })();

      // Layer 2: Proactive Context Enrichment for search/ask
      const enrichableTools = ['aidrive_search', 'aidrive_ask'];
      if (enrichableTools.includes(name) && !toolResult.isError && toolResult.content?.length > 0) {
        try {
          const firstText = toolResult.content[0];
          // Skip if response already contains compiled context (avoid duplication)
          if (firstText.type === 'text' && !firstText.text.includes('_Compilation:')) {
            const queryText = name === 'aidrive_search'
              ? (args as any).query as string
              : (args as any).question as string;
            const { compileContext } = await import('../services/context-compiler/index.js');
            const enrichResult = await compileContext(userId, {
              task: queryText,
              tokenBudget: 600,
              role: detectedCaps?.role || inferRole(agentName),
              hints: detectedProjectId ? { project: detectedProjectName || undefined } : undefined,
            });
            // Extract up to 3 snippets, each ≤200 tokens (~800 chars)
            if (enrichResult.compiledContext && enrichResult.metadata.fragmentCount > 0) {
              const snippets = enrichResult.compiledContext
                .split(/\n(?=##?\s)/)
                .filter(s => s.trim().length > 20)
                .slice(0, 3)
                .map(s => s.slice(0, 800).trim());
              if (snippets.length > 0) {
                const enrichmentBlock = `\n\n## Related from your knowledge base\n\n${snippets.join('\n\n---\n\n')}`;
                toolResult = {
                  ...toolResult,
                  content: [
                    { type: 'text' as const, text: firstText.text + enrichmentBlock },
                    ...toolResult.content.slice(1),
                  ],
                };
              }
            }
          }
        } catch (enrichErr) {
          // Silent failure — log but return normal response
          console.error('[MCP Layer 2] Context enrichment failed:', (enrichErr as Error).message);
        }
      }

      // Prepend welcome brief to the first successful tool response
      if (welcomeBrief && !toolResult.isError && toolResult.content?.length > 0) {
        const firstContent = toolResult.content[0];
        if (firstContent.type === 'text') {
          return {
            ...toolResult,
            content: [
              { type: 'text' as const, text: welcomeBrief + '\n\n' + firstContent.text },
              ...toolResult.content.slice(1),
            ],
          };
        }
      }
      return toolResult;
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  });

  // Resources — expose recent knowledge for auto-injection
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // Identity resource
    const [user] = await db.select({ name: schema.users.name, email: schema.users.email, profile: schema.users.profile })
      .from(schema.users).where(eq(schema.users.id, userId));
    const profile = (user?.profile as Record<string, any>) || {};
    const identityText = [
      user?.name ? `名称: ${user.name}` : '',
      profile.role ? `角色: ${profile.role}` : '',
      profile.currentGoal ? `当前目标: ${profile.currentGoal}` : '',
      profile.background ? `背景: ${profile.background}` : '',
      profile.preferences ? `偏好: ${profile.preferences}` : '',
    ].filter(Boolean).join('\n');

    let relevantFiles;

    if (agentName) {
      // Smart matching: use agent name/description as semantic query
      try {
        const [queryVec] = await embedTexts([agentName]);
        const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 5 });
        // Get unique file IDs from semantic search results
        const fileIds = [...new Set(chunks.map(c => c.fileId))].slice(0, 5);
        if (fileIds.length > 0) {
          relevantFiles = await db.select({
            id: schema.files.id,
            name: schema.files.name,
            summary: schema.files.summary,
            createdAt: schema.files.createdAt,
          })
            .from(schema.files)
            .where(eq(schema.files.userId, userId))
            .orderBy(desc(schema.files.createdAt))
            .limit(5);
          // Filter to only semantically matched files
          relevantFiles = relevantFiles.filter(f => fileIds.includes(f.id));
        }
      } catch {
        // Fallback to recent files if embedding fails
      }
    }

    // Fallback: recent files
    if (!relevantFiles || relevantFiles.length === 0) {
      relevantFiles = await db.select({
        id: schema.files.id,
        name: schema.files.name,
        summary: schema.files.summary,
        createdAt: schema.files.createdAt,
      })
        .from(schema.files)
        .where(eq(schema.files.userId, userId))
        .orderBy(desc(schema.files.createdAt))
        .limit(5);
    }

    return {
      resources: [
        {
          uri: 'aidrive://identity',
          name: '用户档案',
          description: identityText || '未设置个人档案',
          mimeType: 'text/plain',
        },
        ...relevantFiles.map(f => ({
        uri: `aidrive://files/${f.id}`,
        name: f.name,
        description: f.summary?.slice(0, 100) || '无摘要',
        mimeType: 'text/plain',
      })),
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === 'aidrive://identity') {
      const [user] = await db.select({ name: schema.users.name, email: schema.users.email, profile: schema.users.profile })
        .from(schema.users).where(eq(schema.users.id, userId));
      const profile = (user?.profile as Record<string, any>) || {};
      const text = [
        user?.name ? `名称: ${user.name}` : '',
        user?.email ? `邮箱: ${user.email}` : '',
        profile.role ? `角色: ${profile.role}` : '',
        profile.currentGoal ? `当前目标: ${profile.currentGoal}` : '',
        profile.background ? `背景: ${profile.background}` : '',
        profile.preferences ? `偏好: ${profile.preferences}` : '',
      ].filter(Boolean).join('\n');
      return { contents: [{ uri, text: text || '未设置个人档案', mimeType: 'text/plain' }] };
    }

    const fileId = uri.replace('aidrive://files/', '');
    const [file] = await db.select().from(schema.files).where(eq(schema.files.id, fileId));
    if (!file || file.userId !== userId) {
      return { contents: [{ uri, text: '文件不存在或无权访问', mimeType: 'text/plain' }] };
    }
    return {
      contents: [{
        uri,
        text: `# ${file.name}\n\n${file.summary || '无摘要'}\n\n状态: ${file.status}\n创建: ${file.createdAt}`,
        mimeType: 'text/plain',
      }],
    };
  });

  // Prompts — predefined prompt templates for knowledge-first interaction
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'knowledge_check',
        description: '在回答问题前，先检查用户知识库是否有相关信息',
        arguments: [
          { name: 'question', description: '用户的问题', required: true },
        ],
      },
      {
        name: 'daily_briefing',
        description: '生成今日知识库活动简报——新文件、新洞察、近期对话摘要',
        arguments: [],
      },
      {
        name: 'knowledge_capture',
        description: '将当前对话中的关键发现存入知识库',
        arguments: [
          { name: 'summary', description: '关键发现摘要', required: true },
        ],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'knowledge_check': {
        const question = args?.question || '';
        // Search knowledge base for relevant context
        const [queryVec] = await embedTexts([question]);
        const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 3 });
        const context = chunks.map(c => `[${c.fileName}]: ${c.text.slice(0, 200)}`).join('\n\n');

        return {
          description: '知识库上下文已加载',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `以下是用户知识库中与问题相关的内容：\n\n${context || '（知识库中未找到直接相关内容）'}\n\n基于以上知识库内容和你自己的知识，回答用户问题：${question}`,
              },
            },
          ],
        };
      }

      case 'daily_briefing': {
        const recentFiles = await db.select({ name: schema.files.name, summary: schema.files.summary, createdAt: schema.files.createdAt })
          .from(schema.files)
          .where(eq(schema.files.userId, userId))
          .orderBy(desc(schema.files.createdAt))
          .limit(5);

        const recentInsights = await db.select({ title: schema.insights.title, description: schema.insights.description })
          .from(schema.insights)
          .where(eq(schema.insights.userId, userId))
          .orderBy(desc(schema.insights.createdAt))
          .limit(3);

        const briefing = `## 知识库简报\n\n### 最近文件\n${recentFiles.map(f => `- ${f.name}: ${f.summary?.slice(0, 80) || '处理中...'}`).join('\n')}\n\n### AI 洞察\n${recentInsights.map(i => `- ${i.title}: ${i.description?.slice(0, 80)}`).join('\n') || '暂无新洞察'}`;

        return {
          description: '今日知识库简报',
          messages: [
            { role: 'user' as const, content: { type: 'text' as const, text: briefing } },
          ],
        };
      }

      case 'knowledge_capture': {
        const summary = args?.summary || '';
        return {
          description: '准备存入知识库',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `请将以下内容存入 AI Drive 知识库：\n\n${summary}\n\n调用 aidrive_capture_conversation 工具执行存储。`,
              },
            },
          ],
        };
      }

      default:
        return { description: '未知 prompt', messages: [] };
    }
  });

  return server;
}
