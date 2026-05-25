export interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; createdAt: string
  citations?: { fileId?: string; fileName?: string; chunkIndex?: number; text?: string; index?: number; filename?: string; snippet?: string }[]
  error?: string
}
export interface Conversation { id: string; title: string; createdAt: string; scope?: { type: "all" | "folder" | "file"; id?: string; name?: string } }
export const mockConversations: Conversation[] = [
  { id: "c1", title: "产品需求文档分析", createdAt: "2026-03-31T10:00:00Z", scope: { type: "file", id: "1", name: "产品需求文档 v2.pdf" } },
  { id: "c2", title: "技术方案讨论", createdAt: "2026-03-30T14:00:00Z", scope: { type: "all" } },
]
export const mockMessages: Record<string, ChatMessage[]> = {
  c1: [
    { id: "m1", role: "user", content: "帮我总结这个文件的要点", createdAt: "2026-03-31T10:00:00Z" },
    { id: "m2", role: "assistant", content: "根据文档内容，主要有以下几个要点：\n\n1. **核心功能**：文件上传与 AI 记忆，让用户可以通过对话方式查询文件内容 [1]\n2. **技术架构**：采用 RAG（检索增强生成）方案，文件解析后向量化存储 [2]\n3. **用户限制**：免费用户 5GB 存储，每日 20 次对话\n4. **MVP 范围**：Web 端优先，支持 PDF/TXT/Markdown 三种格式", createdAt: "2026-03-31T10:00:30Z", citations: [{ index: 1, filename: "产品需求文档 v2.pdf", snippet: "核心功能是让 AI 记住用户上传的文件，通过自然语言对话进行查询..." }, { index: 2, filename: "产品需求文档 v2.pdf", snippet: "技术方案采用 RAG 架构，文件经过解析、分块、向量化后存储在向量数据库中..." }] },
  ],
  c2: [
    { id: "m3", role: "user", content: "对比一下不同的向量数据库方案", createdAt: "2026-03-30T14:00:00Z" },
    { id: "m4", role: "assistant", content: "根据你的文件，以下是主要方案对比：\n\n| 方案 | 优势 | 劣势 |\n|------|------|------|\n| Qdrant | 性能好，Rust 实现 | 社区较小 |\n| Pinecone | 全托管 | 成本高 |\n| Weaviate | 功能全 | 资源占用大 |\n\n综合考虑 MVP 阶段，**Qdrant** 是性价比最高的选择 [1]。", createdAt: "2026-03-30T14:00:45Z", citations: [{ index: 1, filename: "技术方案.md", snippet: "向量数据库选型：Qdrant 作为首选方案，支持过滤搜索和负载管理..." }] },
  ],
}
export function mockSSEStream(message: string, onToken: (t: string) => void, onDone: (citations: ChatMessage["citations"]) => void) {
  const response = "这是一个模拟的 AI 回复。你的问题是：" + message.slice(0, 20) + "...\n\n让我帮你分析相关内容 [1]。"
  const tokens = response.split("")
  let i = 0
  const interval = setInterval(() => {
    if (i < tokens.length) { onToken(tokens[i]); i++ }
    else { clearInterval(interval); onDone([{ index: 1, filename: "产品需求文档 v2.pdf", snippet: "相关内容片段..." }]) }
  }, 30)
  return () => clearInterval(interval)
}
