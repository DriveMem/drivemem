import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar, preprocessQuery } from '../services/vector.service.js';
import { chat } from '../services/llm.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

export function createMcpServer(userId: string): Server {
  const server = new Server(
    { name: 'ai-drive', version: '1.0.0' },
    { capabilities: { tools: {} } }
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
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'aidrive_search': {
          const query = (args as any).query as string;
          const budget = ((args as any).contextBudget as number) || 0;
          const format = ((args as any).preferFormat as string) || 'text';
          const [queryVec] = await embedTexts([preprocessQuery(query)]);
          const results = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: budget && budget < 3000 ? 3 : 5 });
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
          return { content: [{ type: 'text' as const, text: text || '未找到相关内容。' }] };
        }

        case 'aidrive_ask': {
          const question = (args as any).question as string;
          const budget = ((args as any).contextBudget as number) || 0;
          const format = ((args as any).preferFormat as string) || 'text';
          const [queryVec] = await embedTexts([preprocessQuery(question)]);
          const chunks = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: budget && budget < 2000 ? 3 : 6 });
          const chunkChars = budget ? Math.min(Math.floor((budget * 2) / Math.max(chunks.length, 1)), 1000) : 500;
          const citations = chunks.map((c, i) => `来源 ${i + 1} (${c.fileName}): ${c.text.slice(0, chunkChars)}`).join('\n\n');
          const lengthHint = budget && budget < 1000 ? `\n请简洁回答，控制在 ${budget} 字以内。` : '';
          const formatHint = format === 'summary' ? '\n用要点列表（bullet points）回答，每点一行。' : format === 'structured' ? '\n用 JSON 格式回答：{"answer":"...","keyPoints":["..."],"confidence":"high/medium/low"}' : '';
          const systemPrompt = `你是 AI Drive 的文档 AI 助手。严格基于文档内容回答。用上标¹²³引用来源。${lengthHint}${formatHint}\n\n[文档片段]\n${citations || '(未找到相关文档)'}`;
          const answer = await chat([{ role: 'system', content: systemPrompt }, { role: 'user', content: question }]);
          return { content: [{ type: 'text' as const, text: answer }] };
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
          const data = await fetchTimeline(userId, limit, 0);
          if (data.events.length === 0) return { content: [{ type: 'text' as const, text: '暂无活动记录。上传文件或与 AI 对话后会出现活动。' }] };
          const text = data.events.map((e: any) => {
            const date = new Date(e.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const desc = e.description ? ` — ${e.description.slice(0, 60)}` : '';
            return `${e.icon} [${date}] ${e.title}${desc}`;
          }).join('\n');
          return { content: [{ type: 'text' as const, text: `最近 ${data.events.length} 条活动（共 ${data.total}）：\n\n${text}` }] };
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

        default:
          return { content: [{ type: 'text' as const, text: `未知工具: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `错误: ${(err as Error).message}` }], isError: true };
    }
  });

  return server;
}
