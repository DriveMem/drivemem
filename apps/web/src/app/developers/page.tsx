import Link from "next/link"

export const metadata = {
  title: "开发者 - AI Drive",
  description: "AI Drive API 文档、MCP 协议和 CLI 工具",
}

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">AI Drive</Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回首页</Link>
      </nav>
      
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold mb-4">🔧 开发者</h1>
        <p className="text-lg text-[#6B6966] mb-12">
          让你的 AI agent 接入 AI Drive 知识库
        </p>
        
        {/* API Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">📡 Open API</h2>
          <p className="text-sm text-[#6B6966] mb-4">
            通过 API Key 认证，任何应用都能访问你的知识库。
          </p>
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <code className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-mono">GET</code>
              <div>
                <code className="text-sm font-mono">/api/v1/search?q=关键词</code>
                <p className="text-xs text-[#6B6966] mt-1">语义搜索知识库</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-mono">POST</code>
              <div>
                <code className="text-sm font-mono">/api/v1/ask</code>
                <p className="text-xs text-[#6B6966] mt-1">基于知识库问答（RAG）</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-mono">GET</code>
              <div>
                <code className="text-sm font-mono">/api/v1/files</code>
                <p className="text-xs text-[#6B6966] mt-1">列出文件</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-mono">GET</code>
              <div>
                <code className="text-sm font-mono">/api/v1/insights</code>
                <p className="text-xs text-[#6B6966] mt-1">获取 AI 洞察</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <code className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-mono">GET</code>
              <div>
                <code className="text-sm font-mono">/api/v1/timeline</code>
                <p className="text-xs text-[#6B6966] mt-1">知识活动时间线</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#6B6966]">
            认证方式：<code className="rounded bg-muted px-1">Authorization: Bearer ak_xxx</code>
            。在 <Link href="/settings" className="text-[#4F5BD5] hover:underline">设置页</Link> 创建 API Key。
          </p>
        </section>

        {/* MCP Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">🔌 MCP 协议</h2>
          <p className="text-sm text-[#6B6966] mb-4">
            支持 MCP（Model Context Protocol）的 AI 工具可以即插即用。
          </p>
          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium mb-2">配置示例（Claude Desktop / OpenClaw）：</p>
            <pre className="rounded-lg bg-muted p-3 text-xs font-mono overflow-x-auto">{`{
  "mcpServers": {
    "ai-drive": {
      "command": "node",
      "args": ["apps/api/src/mcp/server.js"],
      "env": {
        "MCP_API_KEY": "ak_your_key",
        "MCP_USER_ID": "your_user_id"
      }
    }
  }
}`}</pre>
            <p className="mt-3 text-xs text-[#6B6966]">
              9 个 Tools：search / ask / list_files / file_detail / get_insights / suggest_workflow / upload_file / timeline
            </p>
          </div>
        </section>

        {/* CLI Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">⌨️ CLI 工具</h2>
          <p className="text-sm text-[#6B6966] mb-4">
            命令行直接操作知识库。
          </p>
          <div className="rounded-xl border p-4">
            <pre className="rounded-lg bg-muted p-3 text-xs font-mono overflow-x-auto">{`# 搜索知识库
aidrive search "关键词"

# 问 AI
aidrive ask "这些文件的核心结论是什么？"

# 查看活动
aidrive timeline

# 上传文件
aidrive upload report.pdf`}</pre>
          </div>
        </section>
      </div>
    </div>
  )
}
