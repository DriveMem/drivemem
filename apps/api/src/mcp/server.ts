import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import service layers
import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar } from '../services/vector.service.js';
import { chat } from '../services/llm.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

// Get user ID from env (MCP connections are per-user)
const USER_ID = process.env.MCP_USER_ID;
if (!USER_ID) {
  console.error('MCP_USER_ID environment variable required');
  process.exit(1);
}

const server = new Server(
  { name: 'ai-drive', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'aidrive_search',
      description: '在用户的个人知识库中进行语义搜索。适用场景：查找历史决策和结论、对比不同文件的观点、验证数据一致性、寻找相关资料辅助写作、回忆之前讨论过的话题。支持自然语言查询，返回最相关的文件片段和相似度分数。当你需要参考用户已有知识时，优先使用此工具。',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: '搜索关键词或问题' },
        },
        required: ['query'],
      },
    },
    {
      name: 'aidrive_ask',
      description: '基于用户知识库中的所有文件回答问题（RAG 问答）。AI 会检索最相关的文档片段并生成有引用来源的回答。适用场景：需要基于用户文件给出准确回答、做跨文件综合分析、回答需要事实依据的问题。与 search 的区别：search 返回原始片段，ask 返回 AI 理解后的结构化回答。',
      inputSchema: {
        type: 'object' as const,
        properties: {
          question: { type: 'string', description: '要问的问题' },
        },
        required: ['question'],
      },
    },
    {
      name: 'aidrive_list_files',
      description: '列出用户知识库中的所有文件，包含文件名、类型、状态和 AI 自动生成的摘要。适用场景：了解用户知识库全貌、查看有哪些可用资料、检查文件索引状态、获取文件 ID 用于后续操作。建议在使用 search 或 ask 之前先调用此工具了解知识库内容。',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'aidrive_get_insights',
      description: '获取 AI 主动发现的知识洞察——文件之间的关联、矛盾观点和共同趋势。这些洞察由 AI 在文件索引时自动生成，无需用户提问。适用场景：发现用户可能没注意到的知识联系、找出文档间的矛盾点、识别跨文件的共同趋势、为用户提供知识库的全局视角。',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'aidrive_file_detail',
      description: '获取某个文件的详细信息，包括 AI 自动生成的摘要、文件类型、状态等。适用场景：深入了解某个特定文件的内容、获取 AI 对文件的理解、在搜索到文件后查看详情。需要文件 ID（可通过 list_files 获取）。',
      inputSchema: {
        type: 'object' as const,
        properties: {
          fileId: { type: 'string', description: '文件 ID' },
        },
        required: ['fileId'],
      },
    },
    {
      name: 'aidrive_suggest_workflow',
      description: '根据用户知识库的当前内容，AI 主动建议 3-5 个可以执行的操作或分析方向。当你不确定知识库能做什么、或想帮用户发现知识价值时调用。常见建议：对比两份文件观点、生成分析报告、检查数据一致性、发现知识盲点等。',
      inputSchema: {
        type: 'object' as const,
        properties: {},
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
        const [queryVec] = await embedTexts([query]);
        const results = await searchSimilar({ userId: USER_ID, query: queryVec, scopeType: 'all', limit: 5 });
        const text = results.map((r, i) =>
          `${i + 1}. [${r.fileName}] (score: ${r.score.toFixed(2)})\n${r.text.slice(0, 300)}`
        ).join('\n\n');
        return { content: [{ type: 'text' as const, text: text || '未找到相关内容。' }] };
      }

      case 'aidrive_ask': {
        const question = (args as any).question as string;
        const [queryVec] = await embedTexts([question]);
        const chunks = await searchSimilar({ userId: USER_ID, query: queryVec, scopeType: 'all', limit: 6 });
        const citations = chunks.map((c, i) => `来源 ${i + 1} (${c.fileName}): ${c.text}`).join('\n\n');
        const systemPrompt = `你是 AI Drive 的文档 AI 助手。严格基于文档内容回答。\n\n[文档片段]\n${citations || '（未找到相关文档）'}`;
        const answer = await chat([{ role: 'system', content: systemPrompt }, { role: 'user', content: question }]);
        return { content: [{ type: 'text' as const, text: answer }] };
      }

      case 'aidrive_list_files': {
        const files = await db.select({
          id: schema.files.id, name: schema.files.name, mimeType: schema.files.mimeType,
          status: schema.files.status, summary: schema.files.summary, createdAt: schema.files.createdAt,
        }).from(schema.files).where(eq(schema.files.userId, USER_ID)).orderBy(desc(schema.files.createdAt));
        const text = files.map(f => `- ${f.name} (${f.mimeType}, ${f.status})\n  摘要: ${f.summary?.slice(0, 100) || '无'}`).join('\n');
        return { content: [{ type: 'text' as const, text: text || '知识库为空。' }] };
      }

      case 'aidrive_get_insights': {
        const insights = await db.select().from(schema.insights)
          .where(eq(schema.insights.userId, USER_ID)).orderBy(desc(schema.insights.createdAt)).limit(10);
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
        const [file] = await db.select().from(schema.files)
          .where(eq(schema.files.id, fileId));
        if (!file || file.userId !== USER_ID) return { content: [{ type: 'text' as const, text: '文件不存在。' }] };
        const text = `文件: ${file.name}\n类型: ${file.mimeType}\n状态: ${file.status}\n摘要: ${file.summary || '无'}\n创建: ${file.createdAt}`;
        return { content: [{ type: 'text' as const, text }] };
      }


      case 'aidrive_suggest_workflow': {
        const files = await db.select({ name: schema.files.name, summary: schema.files.summary })
          .from(schema.files).where(eq(schema.files.userId, USER_ID)).orderBy(desc(schema.files.createdAt)).limit(10);
        if (files.length === 0) return { content: [{ type: 'text' as const, text: '知识库为空。上传文件后 AI 会自动分析并生成操作建议。' }] };
        const fileSummaries = files.map(f => `- ${f.name}: ${f.summary?.slice(0, 80) || '无摘要'}`).join('\n');
        const prompt = `用户知识库有以下文件：\n${fileSummaries}\n\n基于这些文件内容，建议 3-5 个有价值的操作。每条建议一行，格式：emoji + 具体建议（含涉及的文件名）。不要空话。`;
        const suggestions = await chat([{ role: 'user', content: prompt }]);
        return { content: [{ type: 'text' as const, text: suggestions }] };
      }
      default:
        return { content: [{ type: 'text' as const, text: `未知工具: ${name}` }], isError: true };
    }
  } catch (err) {
    return { content: [{ type: 'text' as const, text: `错误: ${(err as Error).message}` }], isError: true };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] AI Drive MCP Server started');
}

main().catch(console.error);
