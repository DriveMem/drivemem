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
      description: '在 AI Drive 知识库中语义搜索。返回最相关的文件片段。',
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
      description: '基于 AI Drive 知识库回答问题。AI 会参考用户上传的所有文件来回答。',
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
      description: '列出 AI Drive 知识库中的所有文件，包含文件名、类型、AI 摘要等信息。',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'aidrive_get_insights',
      description: '获取 AI 主动发现的知识洞察（文件间关联、矛盾、趋势等）。',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'aidrive_file_detail',
      description: '获取某个文件的详细信息，包括 AI 摘要。',
      inputSchema: {
        type: 'object' as const,
        properties: {
          fileId: { type: 'string', description: '文件 ID' },
        },
        required: ['fileId'],
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
