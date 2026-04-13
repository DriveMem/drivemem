import Link from "next/link"

export const metadata = {
  title: "隐私政策 - DriveMem",
  description: "DriveMem 隐私政策和数据保护说明",
  openGraph: { title: "隐私政策 - DriveMem", description: "DriveMem 隐私政策和数据保护说明" },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">DriveMem</Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回首页</Link>
      </nav>
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">数据隐私政策</h1>
      <p className="mt-4 text-muted-foreground">最后更新：2026 年 4 月 · DriveMem</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">数据存储</h2>
          <p>你上传的文件存储在MinIO 对象存储服务器上，位于中国境内。文件元数据和对话记录存储在 PostgreSQL 数据库中。向量索引存储在 Qdrant 向量数据库中。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">数据隔离</h2>
          <p>每个用户的文件、对话和 AI 分析数据完全隔离。你的数据只有你能访问，其他用户无法看到或搜索你的文件内容。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">AI 如何使用你的数据</h2>
          <p>当你上传文件时，AI 会自动解析文件内容、生成摘要、建立向量索引用于语义搜索和对话。这些 AI 处理仅限于你的账户范围内，不会将你的文件内容用于训练 AI 模型或共享给第三方。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">第三方服务</h2>
          <p>DriveMem 使用百炼 API（阿里云）进行文本嵌入和 LLM 对话。你的文件内容片段会发送到百炼 API 进行处理，但不会被百炼存储或用于模型训练。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">数据导出</h2>
          <p>你可以随时在设置页面导出所有数据（文件 + 对话历史），格式为 ZIP 压缩包。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">账号删除</h2>
          <p>你可以随时在设置页面删除账号。删除后，所有文件、对话、AI 分析数据将被永久移除，不可恢复。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">联系我们</h2>
          <p>如有隐私相关问题，请联系 privacy@ai-drive.net。</p>
        </section>
      </div>
      </div>
    </div>
  )
}
