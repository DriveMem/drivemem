import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar, preprocessQuery } from '../services/vector.service.js';
import { chat } from '../services/llm.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and, inArray, sql, gt } from 'drizzle-orm';
import { inferRole } from '../services/context-compiler/agent-profiles.js';
import { compileContext } from '../services/context-compiler/index.js';
import type { DetectedCapabilities } from '../services/capability-detector.js';
import { maybeAccumulate } from '../services/auto-accumulate.js';
import { detectAndLogRelay } from '../services/relay-detector.js';
import { logActivity } from '../services/activity-logger.js';


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
  onToolCall?: (toolName: string, args?: Record<string, unknown>) => void;
  apiKeyId?: string;
}

export function createMcpServer(userId: string, agentName: string = '', options?: McpServerOptions): Server {
  // Track detected project across the session
  let detectedProjectId: string | null = null;
  let detectedProjectName: string | null = null;
  // Track detected capabilities across the session
  let detectedCaps: DetectedCapabilities | null = null;
  // Track DB-configured agent profile (overrides detection)
  let dbAgentProfile: import('../services/context-compiler/agent-profiles.js').DbAgentProfile | null = null;

  // Kick off async DB profile lookup (overrides detection if configured)
  if (options?.apiKeyId) {
    import('../services/context-compiler/agent-profiles.js').then(({ getProfileByApiKeyId }) => {
      getProfileByApiKeyId(userId, options.apiKeyId!).then(profile => {
        if (profile) {
          dbAgentProfile = profile;
          // Override detected caps with DB profile
          if (profile.role || profile.domain) {
            detectedCaps = {
              role: profile.role || 'general',
              domain: profile.domain || 'general',
              confidence: 1.0, // explicit config = max confidence
              signals: [{ source: 'agent-name', key: 'db-profile', value: profile.name, weight: 1.0 }],
            };
          }
        }
      }).catch(() => {});
    }).catch(() => {});
  }

  // Kick off async capability detection on connect (will be overridden by DB profile if present)
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
      instructions: `You are connected to DriveMem — the user's persistent knowledge base across all AI tools.

## When to load context (AUTOMATIC):
- At the START of every conversation: call aidrive_get_context to load background, recent work, and relevant knowledge
- Before answering any domain-specific question: call aidrive_search to check existing knowledge

## When to save knowledge (TRIGGERS):
- User says "OK", "sounds good", "let's do that" → decision made → call aidrive_harvest
- Conversation reaches 10+ messages → call aidrive_harvest with summary
- User explicitly asks to remember something → call aidrive_store
- Analysis or research completed → call aidrive_harvest

## Available Tools (5 only):
- aidrive_search: Semantic search across all files
- aidrive_ask: RAG Q&A with cited sources
- aidrive_store: Save a piece of knowledge (text, decision, note)
- aidrive_harvest: End-of-conversation harvest — extracts decisions, conclusions, TODOs from summary
- aidrive_get_context: Load full project context (files, insights, recent activity) in one call

## Citation
When using knowledge base content, mention the source file name.

## Response hints:
- After every aidrive_search result, ask yourself: "Should I save any conclusions from this conversation?"
- Every conversation should make the knowledge base richer.`,
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // === 5 CORE TOOLS (simplified from 17) ===
      {
        name: 'aidrive_search',
        description: 'IMPORTANT: Call this BEFORE answering any question. Searches the user knowledge base for relevant context. The user expects you to check their existing knowledge before responding. Returns the most relevant file excerpts with relevance scores.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: '搜索关键词或问题' },
            contextBudget: { type: 'number', description: '返回内容的 token 预算（默认完整返回）。小模型传 2000，大模型传 50000' },
            preferFormat: { type: 'string', description: '返回格式：text(自然语言,默认) | structured(JSON) | summary(要点列表)', enum: ['text', 'structured', 'summary'] },
            scope: { type: 'string', description: 'Search scope: "project" (default, searches current project + global) or "all" (searches everything)', enum: ['project', 'all'] },
            projectId: { type: 'string', description: 'Project/folder ID to scope search to. When scope="project" and projectId is set, only returns results from that project + unassigned files.' },
          },
          required: ['query'],
        },
      },
      {
        name: 'aidrive_ask',
        description: 'Get AI-generated answers grounded in the user files, with source citations. Use when you need accurate answers based on the user documents. More thorough than search — analyzes multiple files and synthesizes a comprehensive response.',
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
        name: 'aidrive_store',
        description: 'IMPORTANT: Call this when the conversation produces valuable output. Saves decisions, conclusions, analysis, or action items to the knowledge base. Other AI tools will automatically get access to these insights. Quick and lightweight — just pass content.',
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
        name: 'aidrive_harvest',
        description: 'End-of-conversation knowledge harvest. Pass conversation summary or key points — DriveMem extracts decisions, conclusions, TODOs and stores them structured. Call this when a conversation reaches a natural conclusion or when decisions are made.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            summary: { type: 'string', description: 'Summary of the conversation or key conclusions' },
            decisions: { type: 'array', items: { type: 'string' }, description: 'Explicit decisions made (optional — auto-extracted if not provided)' },
            todos: { type: 'array', items: { type: 'string' }, description: 'Action items identified (optional — auto-extracted if not provided)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization (optional)' },
          },
          required: ['summary'],
        },
      },
      {
        name: 'aidrive_get_context',
        description: 'Load full project context in one call — combines file listing, compiled context, and insights. Recommended at the START of every conversation.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            task: { type: 'string', description: 'Current task description (for context compilation)' },
            tokenBudget: { type: 'number', description: 'Max output tokens (default 8000)' },
            project: { type: 'string', description: 'Project scope filter' },
            scope: { type: 'string', description: 'Search scope: "project" (default) or "all"', enum: ['project', 'all'] },
          },
          required: [],
        },
      },
      // === REMOVED FROM MCP (kept as internal services) ===
      // aidrive_list_files → merged into aidrive_get_context
      // aidrive_file_detail → merged into search results
      // aidrive_compile_context → merged into aidrive_get_context
      // aidrive_get_insights → merged into aidrive_get_context
      // aidrive_suggest_workflow → removed
      // aidrive_timeline → removed
      // aidrive_work_items → merged into search
      // aidrive_auto_capture → merged into aidrive_harvest
      // aidrive_capture_conversation → merged into aidrive_harvest
      // aidrive_upload_file → merged into aidrive_store
      // aidrive_context_packet → removed
      // aidrive_identity → removed (available via resource)
      // aidrive_update_file → kept internally but not exposed
      // aidrive_batch → kept internally but not exposed
    ],
  }));

  // Handle tool calls
  // Track if we've already injected the welcome brief for this session
  let welcomeBriefInjected = false;

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Notify session activity tracker
    options?.onToolCall?.(name, args as Record<string, unknown> | undefined);

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

        // Resume Brief — tell agent what happened while user was away
        try {
          const [user] = await db.select({ lastActiveAt: schema.users.lastActiveAt })
            .from(schema.users).where(eq(schema.users.id, userId));
          const since = user?.lastActiveAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
          const hoursSince = Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60));
          if (hoursSince >= 4) {
            const newFiles = await db.select({ count: sql`count(*)` }).from(schema.files)
              .where(and(eq(schema.files.userId, userId), gt(schema.files.createdAt, new Date(since))));
            const newFileCount = Number(newFiles[0]?.count || 0);
            if (newFileCount > 0 || hoursSince >= 8) {
              lines.push(`\n⏰ **Welcome back** — you were away for ${hoursSince}h`);
              if (newFileCount > 0) lines.push(`📄 ${newFileCount} new file(s) added while you were away`);
            }
          }
          // Update lastActiveAt
          db.update(schema.users).set({ lastActiveAt: new Date() }).where(eq(schema.users.id, userId)).catch(() => {});
        } catch {}

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

        // Onboarding ritual for empty KB vs suggested actions for existing KB
        if (totalFiles === 0) {
          lines.push('\n🎉 **Welcome to DriveMem! Your knowledge base is empty — let\'s fix that.**');
          lines.push('\n**🚀 Quick Start (do these now):**');
          lines.push('1. **Store something** — call aidrive_store with a summary of what you\'re working on right now');
          lines.push('2. **Upload a file** — go to https://drivemem.cloud/files and upload a doc, note, or PDF');
          lines.push('3. **Ask a question** — after storing, try aidrive_search to see it come back');
          lines.push('\n💡 *Tip: Every time this conversation produces a decision or conclusion, store it. Future sessions will thank you.*');
        } else if (recentFiles.length > 0) {
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
          const searchScope = ((args as any).scope as string) || 'project';
          const searchProjectId = (args as any).projectId as string | undefined;

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

          // Determine effective project ID for scoping
          const effectiveProjectId = searchProjectId || detectedProjectId;
          const scopeType = (searchScope === 'project' && effectiveProjectId) ? 'folder' : 'all';
          const scopeId = (searchScope === 'project' && effectiveProjectId) ? effectiveProjectId : undefined;

          const [queryVec] = await embedTexts([preprocessQuery(query)]);
          let results = await searchSimilar({ userId, query: queryVec, scopeType, scopeId, limit: budget && budget < 3000 ? 3 : 5 });

          // Apply feedback weights
          const { applyFeedbackWeights } = await import('../services/feedback-weights.js');
          results = await applyFeedbackWeights(userId, results);

          // LLM Re-ranking (only when enough results)
          if (results.length > 5) {
            try {
              const { rerankResults } = await import('../services/reranker.js');
              results = await rerankResults(query, results);
            } catch { /* re-ranking is best-effort */ }
          }

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
          // Cross-agent relay detection (fire-and-forget)
          logActivity({ userId, agentName, action: 'search', detail: query, metadata: { resultCount: results.length }, relatedFileIds: fileIds });
          detectAndLogRelay(userId, agentName, fileIds);
          // Phase 2: Contextual hint for sparse/empty search results
          let searchHint = '';
          if (results.length === 0) {
            searchHint = '\n\n💡 Tip: Your knowledge base has no matches for this query. Upload more files or use aidrive_store to enrich it.';
          } else if (results.length <= 2) {
            searchHint = '\n\n💡 Tip: Only a few matches found. Upload more files to enrich your knowledge base for better results.';
          }
          const harvestReminder = '\n\n---\n💡 Reminder: If this conversation produced valuable conclusions, call aidrive_harvest to save them.';
          return { content: [{ type: 'text' as const, text: (text || 'No results found.') + searchEnrich + searchHint + harvestReminder }] };
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

          // Use project scope for ask too
          const askScopeType = detectedProjectId ? 'folder' : 'all';
          const askScopeId = detectedProjectId || undefined;

          const [queryVec] = await embedTexts([preprocessQuery(question)]);
          let chunks = await searchSimilar({ userId, query: queryVec, scopeType: askScopeType, scopeId: askScopeId, limit: budget && budget < 2000 ? 3 : 6 });

          // Apply feedback weights
          {
            const { applyFeedbackWeights } = await import('../services/feedback-weights.js');
            chunks = await applyFeedbackWeights(userId, chunks);
          }

          const chunkChars = budget ? Math.min(Math.floor((budget * 2) / Math.max(chunks.length, 1)), 1000) : 500;
          const citations = chunks.map((c, i) => `Source ${i + 1} (${c.fileName}): ${c.text.slice(0, chunkChars)}`).join('\n\n');
          const lengthHint = budget && budget < 1000 ? `\nBe concise, keep answer under ${budget} words.` : '';
          const formatHint = format === 'summary' ? '\nAnswer in bullet points, one per line.' : format === 'structured' ? '\nAnswer in JSON format: {"answer":"...","keyPoints":["..."],"confidence":"high/medium/low"}' : '';
          const systemPrompt = `You are DriveMem AI, the user's personal knowledge assistant. Answer strictly based on the provided documents. Use superscript ¹²³ to cite sources. Always respond in the same language as the user's question.${lengthHint}${formatHint}\n\n[Document excerpts]\n${citations || '(No relevant documents found)'}`;
          const answer = await chat([{ role: 'system', content: systemPrompt }, { role: 'user', content: question }]);
          const askFileIds = [...new Set(chunks.map(c => c.fileId))];
          const askEnrich = await enrichResponse(userId, question, askFileIds);
          // Cross-agent relay detection (fire-and-forget)
          logActivity({ userId, agentName, action: 'ask', detail: question, metadata: { sourceCount: chunks.length }, relatedFileIds: askFileIds });
          detectAndLogRelay(userId, agentName, askFileIds);
          // Phase 2: Contextual hint for ask — nudge storing conclusions
          const askHint = '\n\n---\n💡 Reminder: If this conversation produced valuable conclusions, call aidrive_harvest to save them.';
          return { content: [{ type: 'text' as const, text: answer + askEnrich + askHint }] };
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
          const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'note';
          const filename = `${slug}-${timestamp.slice(0, 10)}.md`;

          const mdContent = `# ${title}\n\n${content}\n\n---\n_存入时间: ${new Date().toLocaleString('zh-CN')}_`;

          const { randomUUID } = await import('crypto');
          const fileId = randomUUID();
          const s3Key = `users/${userId}/files/${fileId}/${filename}`;
          const buffer = Buffer.from(mdContent, 'utf-8');

          const { uploadObject } = await import('../services/s3.service.js');
          await uploadObject(s3Key, buffer, 'text/markdown');

          await db.insert(schema.files).values({
            id: fileId, name: title, originalName: filename,
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
                    name: tagName, color: tagColors[tagName] || '#6B7280', isSystem: true, userId,
                  }).returning();
                }
                if (existingTag) {
                  await db.insert(schema.fileTags).values({ fileId, tagId: existingTag.id });
                }
              } catch { /* skip */ }
            }
          }

                    // Work Graph: extract work items from stored content (fire-and-forget)
          import('../services/work-item-extractor.js').then(({ extractWorkItems }) => {
            extractWorkItems(userId, content, fileId, agentName || undefined, detectedProjectId || undefined).catch(() => {});
          }).catch(() => {});

          // First store celebration (onboarding ritual)
          const [storeCount] = await db.select({ count: sql`count(*)` }).from(schema.files).where(eq(schema.files.userId, userId));
          const isFirstStore = Number(storeCount?.count || 0) <= 1;
          const celebration = isFirstStore
            ? `\n\n🎉 **First knowledge saved!** This is now available across ALL your AI tools connected to DriveMem. Every future session starts smarter. Keep storing decisions and conclusions — your knowledge compounds over time.`
            : '';

          // Phase 2: Contextual hint for store — positive reinforcement
          const storeHint = '\n\n✅ Saved! Next time you or any connected AI searches, this knowledge will be available.';
          return { content: [{ type: 'text' as const, text: `✅ 已存入「${title}」到知识库。AI 正在理解内容，稍后可搜索和问答。${celebration}${storeHint}` }] };
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
            id: fileId, name: title, originalName: filename,
            mimeType: 'text/markdown', size: buffer.length, status: 'parsing', userId, s3Key,
          });

          const { Queue } = await import('bullmq');
          const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
          await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
          await queue.close();

          // Auto-tag as conversation capture
          try {
            let [tag] = await db.select().from(schema.tags).where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, 'conversation')));
            if (!tag) [tag] = await db.insert(schema.tags).values({ name: 'conversation', color: '#8B5CF6', isSystem: true, userId }).returning();
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
                [existing] = await db.insert(schema.tags).values({ name: tn, color: tagColors[tn] || '#6B7280', isSystem: true, userId }).returning();
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
          const compileScope = ((args as any).scope as string) || 'project';
          const compileProjectHint = (args as any).project as string | undefined;
          // If scope=project, use project hint or detected project as folderId for scoped retrieval
          const compileFolderId = (compileScope === 'project') ? (compileProjectHint || detectedProjectId || undefined) : undefined;
          const { compileContext } = await import('../services/context-compiler/index.js');
          const result = await compileContext(userId, {
            task,
            tokenBudget: (args as any).tokenBudget as number | undefined,
            model: (args as any).model ? { name: (args as any).model as string } : undefined,
            role: detectedCaps?.role || inferRole(agentName),
            apiKeyId: options?.apiKeyId,
            hints: {
              project: compileProjectHint,
              folderId: compileFolderId,
              tags: (args as any).tags ? ((args as any).tags as string).split(',').map((t: string) => t.trim()) : undefined,
              recency: (args as any).recency as string | undefined,
            },
          });

          // Check for stale sources and add warning
          let staleWarning = '';
          try {
            const sourceFileIds = result.metadata.sources?.map(s => s.fileId) || [];
            if (sourceFileIds.length > 0) {
              const { files: filesTable } = await import('../db/schema.js');
              const staleSources = await db.select({ id: filesTable.id, name: filesTable.name, staleScore: filesTable.staleScore, lastAccessedAt: filesTable.lastAccessedAt })
                .from(filesTable)
                .where(and(inArray(filesTable.id, sourceFileIds), gt(filesTable.staleScore, 0.5)));
              if (staleSources.length > 0) {
                const DAY_MS = 24 * 60 * 60 * 1000;
                const details = staleSources.map(f => {
                  const daysAgo = f.lastAccessedAt ? Math.floor((Date.now() - f.lastAccessedAt.getTime()) / DAY_MS) : '?';
                  return `${f.name} (last accessed ${daysAgo} days ago)`;
                }).join(', ');
                staleWarning = `\n\n⚠️ Note: some sources may be outdated: ${details}`;
              }
            }
          } catch { /* best-effort */ }

          // Phase 2: Contextual hint for thin compiled context
          let contextHint = '';
          if (result.metadata.fragmentCount <= 2) {
            contextHint = '\n\n💡 Tip: Your knowledge base has limited context for this task. Upload more files or use aidrive_store to build richer context.';
          }
          const summary = `${result.compiledContext}${staleWarning}${contextHint}\n\n---\n_Compilation: ${result.metadata.fragmentCount} fragments, ${result.metadata.totalTokens}/${result.metadata.tokenBudget} tokens, ${result.metadata.compilationTimeMs}ms, coverage: ${result.metadata.coverage}_`;
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

        case 'aidrive_work_items': {
          const action = ((args as any).action as string) || 'list';

          if (action === 'list') {
            const conditions = [eq(schema.workItems.userId, userId)];
            if ((args as any).type) conditions.push(eq(schema.workItems.type, (args as any).type));
            if ((args as any).status) conditions.push(eq(schema.workItems.status, (args as any).status));
            if ((args as any).folderId) conditions.push(eq(schema.workItems.folderId, (args as any).folderId));

            const items = await db.select()
              .from(schema.workItems)
              .where(and(...conditions))
              .orderBy(desc(schema.workItems.createdAt))
              .limit(50);

            if (items.length === 0) {
              return { content: [{ type: 'text' as const, text: 'No work items found.' }] };
            }

            const typeEmoji: Record<string, string> = { decision: '🎯', todo: '📌', blocker: '🔴', milestone: '🏁', insight: '💡' };
            const statusEmoji: Record<string, string> = { active: '⬜', done: '✅', blocked: '🔴', archived: '📦' };
            const lines = items.map(i =>
              `${statusEmoji[i.status] || '⬜'} ${typeEmoji[i.type] || '📋'} [${i.type}] ${i.title}${i.priority ? ` (${i.priority})` : ''}${i.sourceAgent ? ` — by ${i.sourceAgent}` : ''} | id:${i.id}`
            );
            return { content: [{ type: 'text' as const, text: `Work Items (${items.length}):\n${lines.join('\n')}` }] };
          }

          if (action === 'update') {
            const itemId = (args as any).itemId as string;
            const newStatus = (args as any).newStatus as string;
            if (!itemId) return { content: [{ type: 'text' as const, text: 'itemId required for update.' }], isError: true };
            if (!newStatus || !['active', 'done', 'blocked', 'archived'].includes(newStatus)) {
              return { content: [{ type: 'text' as const, text: 'newStatus must be active/done/blocked/archived.' }], isError: true };
            }
            const updates: Record<string, any> = { status: newStatus, updatedAt: new Date() };
            if (newStatus === 'done') updates.completedAt = new Date();
            const [updated] = await db.update(schema.workItems).set(updates)
              .where(and(eq(schema.workItems.id, itemId), eq(schema.workItems.userId, userId)))
              .returning();
            if (!updated) return { content: [{ type: 'text' as const, text: 'Work item not found.' }], isError: true };
            return { content: [{ type: 'text' as const, text: `✅ Updated "${updated.title}" → ${newStatus}` }] };
          }

          if (action === 'delete') {
            const itemId = (args as any).itemId as string;
            if (!itemId) return { content: [{ type: 'text' as const, text: 'itemId required for delete.' }], isError: true };
            await db.delete(schema.workItems)
              .where(and(eq(schema.workItems.id, itemId), eq(schema.workItems.userId, userId)));
            return { content: [{ type: 'text' as const, text: '🗑️ Work item deleted.' }] };
          }

          return { content: [{ type: 'text' as const, text: `Unknown action: ${action}` }], isError: true };
        }

        case 'aidrive_harvest': {
          const summary = (args as any).summary as string;
          if (!summary) return { content: [{ type: 'text' as const, text: 'summary parameter required.' }], isError: true };
          const decisions = (args as any).decisions as string[] | undefined;
          const todos = (args as any).todos as string[] | undefined;
          const harvestTags = (args as any).tags as string[] | undefined;

          // Build structured markdown from provided + auto-extracted content
          const sections: string[] = [`# Conversation Harvest\n\n## Summary\n${summary}`];
          if (decisions && decisions.length > 0) {
            sections.push(`\n## Decisions\n${decisions.map(d => `- ✅ ${d}`).join('\n')}`);
          }
          if (todos && todos.length > 0) {
            sections.push(`\n## Action Items\n${todos.map(t => `- [ ] ${t}`).join('\n')}`);
          }
          const harvestContent = sections.join('\n');

          // Use auto-capture service for LLM extraction as well
          const { autoCapture } = await import('../services/auto-capture.js');
          const captureResult = await autoCapture(userId, harvestContent, { projectId: detectedProjectId || undefined });

          // Also store the structured harvest itself
          const { randomUUID } = await import('crypto');
          const harvestFileId = randomUUID();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `harvest-${timestamp.slice(0, 10)}.md`;
          const mdContent = `${harvestContent}\n\n---\n_Harvested: ${new Date().toLocaleString()} | Auto-extracted: ${captureResult.captured} items_`;
          const s3Key = `users/${userId}/files/${harvestFileId}/${filename}`;
          const buffer = Buffer.from(mdContent, 'utf-8');

          const { uploadObject } = await import('../services/s3.service.js');
          await uploadObject(s3Key, buffer, 'text/markdown');

          await db.insert(schema.files).values({
            id: harvestFileId, name: `Harvest: ${summary.slice(0, 40)}`, originalName: filename,
            mimeType: 'text/markdown', size: buffer.length, status: 'parsing', userId, s3Key,
            ...(detectedProjectId ? { folderId: detectedProjectId } : {}),
          });

          const { Queue } = await import('bullmq');
          const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
          await queue.add('parse', { fileId: harvestFileId, userId, s3Key, mimeType: 'text/markdown' });
          await queue.close();

          // Apply tags
          if (harvestTags && harvestTags.length > 0) {
            for (const tagName of harvestTags.slice(0, 5)) {
              try {
                let [existing] = await db.select().from(schema.tags).where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, tagName)));
                if (!existing) [existing] = await db.insert(schema.tags).values({ name: tagName, color: '#6B7280', isSystem: true, userId }).returning();
                if (existing) await db.insert(schema.fileTags).values({ fileId: harvestFileId, tagId: existing.id });
              } catch { /* skip */ }
            }
          }

          // Work items extraction (fire-and-forget)
          import('../services/work-item-extractor.js').then(({ extractWorkItems }) => {
            extractWorkItems(userId, harvestContent, harvestFileId, agentName || undefined, detectedProjectId || undefined).catch(() => {});
          }).catch(() => {});

          const autoItems = captureResult.items.length > 0
            ? `\nAuto-extracted: ${captureResult.items.map(i => i.title).join(', ')}`
            : '';
          return { content: [{ type: 'text' as const, text: `✅ Harvest saved! Stored structured summary with ${decisions?.length || 0} decisions, ${todos?.length || 0} TODOs.${autoItems}` }] };
        }

        case 'aidrive_get_context': {
          const task = (args as any).task as string || 'general session context';
          const compileScope = ((args as any).scope as string) || 'project';
          const compileProjectHint = (args as any).project as string | undefined;
          const compileFolderId = (compileScope === 'project') ? (compileProjectHint || detectedProjectId || undefined) : undefined;

          // 1. Compile context
          const { compileContext: compileCtx } = await import('../services/context-compiler/index.js');
          const ctxResult = await compileCtx(userId, {
            task,
            tokenBudget: (args as any).tokenBudget as number | undefined,
            role: detectedCaps?.role || inferRole(agentName),
            apiKeyId: options?.apiKeyId,
            hints: {
              project: compileProjectHint,
              folderId: compileFolderId,
            },
          });

          // 2. File listing (recent 10)
          const recentFiles = await db.select({ id: schema.files.id, name: schema.files.name, summary: schema.files.summary, createdAt: schema.files.createdAt })
            .from(schema.files).where(eq(schema.files.userId, userId))
            .orderBy(desc(schema.files.createdAt)).limit(10);
          const fileList = recentFiles.length > 0
            ? '\n\n## Recent Files\n' + recentFiles.map(f => `- ${f.name}: ${f.summary?.slice(0, 100) || 'processing...'}`).join('\n')
            : '';

          // 3. Insights (top 5)
          let insightText = '';
          try {
            const insights = await db.select().from(schema.insights)
              .where(eq(schema.insights.userId, userId)).orderBy(desc(schema.insights.createdAt)).limit(5);
            if (insights.length > 0) {
              insightText = '\n\n## AI Insights\n' + insights.map(i => `- 💡 ${i.title}: ${i.description?.slice(0, 100)}`).join('\n');
            }
          } catch { /* skip */ }

          const summary = `${ctxResult.compiledContext}${fileList}${insightText}\n\n---\n_Context: ${ctxResult.metadata.fragmentCount} fragments, ${ctxResult.metadata.totalTokens} tokens, ${recentFiles.length} files_`;
          return { content: [{ type: 'text' as const, text: summary }] };
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
              apiKeyId: options?.apiKeyId,
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

      // Layer 3: Auto-accumulate valuable insights from search/ask (fire-and-forget)
      if ((name === 'aidrive_search' || name === 'aidrive_ask') && !toolResult.isError) {
        const queryText = name === 'aidrive_search'
          ? (args as any).query as string
          : (args as any).question as string;
        const resultText = toolResult.content?.[0]?.type === 'text' ? (toolResult.content[0] as any).text : '';
        maybeAccumulate(userId, name, queryText, resultText);
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
      user?.name ? `Name: ${user.name}` : '',
      profile.role ? `Role: ${profile.role}` : '',
      profile.currentGoal ? `Current Goal: ${profile.currentGoal}` : '',
      profile.background ? `Background: ${profile.background}` : '',
      profile.preferences ? `Preferences: ${profile.preferences}` : '',
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
          uri: 'aidrive://context',
          name: 'Your Knowledge Context',
          description: 'Auto-compiled briefing from your knowledge base. Read this to understand the user background.',
          mimeType: 'text/markdown',
        },
        {
          uri: 'aidrive://identity',
          name: 'User Profile',
          description: identityText || 'No profile configured',
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

    if (uri === 'aidrive://context') {
      try {
        const result = await compileContext(userId, { task: 'general context for AI assistant', tokenBudget: 3000 });
        return { contents: [{ uri, text: result.compiledContext || 'Knowledge base is empty. Upload files to build your context.', mimeType: 'text/markdown' }] };
      } catch {
        return { contents: [{ uri, text: 'Knowledge base is empty. Upload files to build your context.', mimeType: 'text/markdown' }] };
      }
    }

    if (uri === 'aidrive://identity') {
      const [user] = await db.select({ name: schema.users.name, email: schema.users.email, profile: schema.users.profile })
        .from(schema.users).where(eq(schema.users.id, userId));
      const profile = (user?.profile as Record<string, any>) || {};
      const text = [
        user?.name ? `Name: ${user.name}` : '',
        user?.email ? `Email: ${user.email}` : '',
        profile.role ? `Role: ${profile.role}` : '',
        profile.currentGoal ? `Current Goal: ${profile.currentGoal}` : '',
        profile.background ? `Background: ${profile.background}` : '',
        profile.preferences ? `Preferences: ${profile.preferences}` : '',
      ].filter(Boolean).join('\n');
      return { contents: [{ uri, text: text || 'No profile configured', mimeType: 'text/plain' }] };
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
        name: 'drivemem-context',
        description: 'Your personal knowledge context — recent decisions, project status, and key information from your knowledge base. Loaded automatically at conversation start.',
        arguments: [],
      },
      {
        name: 'project-briefing',
        description: 'Get a briefing on a specific project from your knowledge base.',
        arguments: [
          { name: 'project', description: 'Project name or topic', required: true },
        ],
      },
      {
        name: 'start_with_context',
        description: 'Load your full project context — recommended at the start of any session',
        arguments: [
          { name: 'task', description: 'What you are working on (optional)', required: false },
        ],
      },
      {
        name: 'what_do_i_know',
        description: 'Search your knowledge base for a topic',
        arguments: [
          { name: 'topic', description: 'Topic to search for', required: true },
        ],
      },
      {
        name: 'knowledge_check',
        description: 'Check the knowledge base before answering a question',
        arguments: [
          { name: 'question', description: 'The question to check against', required: true },
        ],
      },
      {
        name: 'daily_briefing',
        description: 'Generate a daily briefing of knowledge base activity — new files, insights, recent conversations',
        arguments: [],
      },
      {
        name: 'knowledge_capture',
        description: 'Save key findings from the current conversation to the knowledge base',
        arguments: [
          { name: 'summary', description: 'Summary of key findings', required: true },
        ],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'drivemem-context': {
        try {
          const recentKBFiles = await db.select({
            name: schema.files.name,
            summary: schema.files.summary,
            updatedAt: schema.files.updatedAt,
          }).from(schema.files)
            .where(eq(schema.files.userId, userId))
            .orderBy(desc(schema.files.updatedAt))
            .limit(5);

          const recentActivity = await db.select({
            type: schema.notifications.type,
            title: schema.notifications.title,
            message: schema.notifications.message,
            createdAt: schema.notifications.createdAt,
          }).from(schema.notifications)
            .where(eq(schema.notifications.userId, userId))
            .orderBy(desc(schema.notifications.createdAt))
            .limit(5);

          let context = `# DriveMem — Your Knowledge Context\n\n`;
          context += `*Auto-generated at ${new Date().toISOString()}*\n\n`;

          if (recentKBFiles.length > 0) {
            context += `## Recent Knowledge\n`;
            for (const f of recentKBFiles) {
              const summary = f.summary ? f.summary.slice(0, 150) : 'No summary';
              context += `- **${f.name}**: ${summary}\n`;
            }
            context += `\n`;
          }

          if (recentActivity.length > 0) {
            context += `## Recent Activity\n`;
            for (const a of recentActivity) {
              context += `- ${a.title || a.type}: ${a.message || ''}\n`;
            }
            context += `\n`;
          }

          context += `\n---\nUse this context when relevant. For more details, use the aidrive_search or aidrive_ask tools.\n`;
          context += `💡 When this conversation produces valuable conclusions, call aidrive_harvest to save them.\n`;

          return {
            messages: [
              {
                role: 'user' as const,
                content: { type: 'text' as const, text: context },
              },
            ],
          };
        } catch (err) {
          return {
            messages: [
              {
                role: 'user' as const,
                content: { type: 'text' as const, text: 'DriveMem is connected. Use aidrive_search to find knowledge, aidrive_harvest to save conclusions.' },
              },
            ],
          };
        }
      }

      case 'project-briefing': {
        try {
          const project = args?.project || '';
          const [queryVec] = await embedTexts([project]);
          const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 5 });

          let briefing = `# Project Briefing: ${project}\n\n`;
          if (chunks.length > 0) {
            for (const c of chunks) {
              briefing += `## ${c.fileName}\n${c.text.slice(0, 300)}\n\n`;
            }
          } else {
            briefing += `No knowledge found for "${project}". Try uploading relevant files or use aidrive_store to save information.\n`;
          }

          return {
            messages: [
              {
                role: 'user' as const,
                content: { type: 'text' as const, text: briefing },
              },
            ],
          };
        } catch {
          return {
            messages: [
              {
                role: 'user' as const,
                content: { type: 'text' as const, text: `Could not generate briefing for "${args?.project || ''}". Try aidrive_search instead.` },
              },
            ],
          };
        }
      }

      case 'start_with_context': {
        try {
          const { compileContext } = await import('../services/context-compiler/index.js');
          const result = await compileContext(userId, {
            task: args?.task || 'general session',
            role: detectedCaps?.role || inferRole(agentName),
            apiKeyId: options?.apiKeyId,
          });
          return {
            description: 'Your project context has been loaded',
            messages: [
              {
                role: 'assistant' as const,
                content: {
                  type: 'text' as const,
                  text: result.compiledContext || 'Knowledge base is empty. Start by uploading files or using aidrive_store to save knowledge.',
                },
              },
            ],
          };
        } catch {
          return {
            description: 'Knowledge base is empty',
            messages: [
              {
                role: 'assistant' as const,
                content: {
                  type: 'text' as const,
                  text: 'Knowledge base is empty or could not be loaded. Start by uploading files or using aidrive_store to save knowledge.',
                },
              },
            ],
          };
        }
      }

      case 'what_do_i_know': {
        const topic = args?.topic || '';
        const [queryVec] = await embedTexts([preprocessQuery(topic)]);
        const results = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 5 });

        if (results.length === 0) {
          return {
            description: `No knowledge found for "${topic}"`,
            messages: [
              {
                role: 'assistant' as const,
                content: {
                  type: 'text' as const,
                  text: `No results found for "${topic}" in your knowledge base. Try uploading relevant files or saving knowledge with aidrive_store.`,
                },
              },
            ],
          };
        }

        const formatted = results.map((r, i) =>
          `${i + 1}. **${r.fileName}** (score: ${r.score.toFixed(2)})\n${r.text.slice(0, 300)}`
        ).join('\n\n');

        return {
          description: `Found ${results.length} results for "${topic}"`,
          messages: [
            {
              role: 'assistant' as const,
              content: {
                type: 'text' as const,
                text: `Here's what your knowledge base contains about "${topic}":\n\n${formatted}`,
              },
            },
          ],
        };
      }

      case 'knowledge_check': {
        const question = args?.question || '';
        // Search knowledge base for relevant context
        const [queryVec] = await embedTexts([question]);
        const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 3 });
        const context = chunks.map(c => `[${c.fileName}]: ${c.text.slice(0, 200)}`).join('\n\n');

        return {
          description: 'Knowledge base context loaded',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `Here is relevant context from the knowledge base:\n\n${context || '(No directly relevant content found)'}\n\nBased on the above knowledge and your own knowledge, answer the question: ${question}`,
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
          description: 'Daily knowledge base briefing',
          messages: [
            { role: 'user' as const, content: { type: 'text' as const, text: briefing } },
          ],
        };
      }

      case 'knowledge_capture': {
        const summary = args?.summary || '';
        return {
          description: 'Ready to save to knowledge base',
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `Please save the following to the AI Drive knowledge base:\n\n${summary}\n\nCall the aidrive_capture_conversation tool to execute the save.`,
              },
            },
          ],
        };
      }

      default:
        return { description: 'Unknown prompt', messages: [] };
    }
  });

  return server;
}
