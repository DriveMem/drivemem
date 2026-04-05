import Link from "next/link"

export const metadata = { title: "使用条款 - AI Drive" }

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">AI Drive</Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回首页</Link>
      </nav>
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">使用条款</h1>
      <p className="mt-4 text-muted-foreground">最后更新：2026 年 4 月 · AI Drive</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">服务范围</h2>
          <p>AI Drive 是一个基于人工智能的个人知识管理平台。你可以上传文档，AI 自动解析、理解并建立知识索引，随时通过对话获取文件内容的分析和回答。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">免费计划限制</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>存储空间：5 GB</li>
            <li>每日 AI 对话：20 次</li>
            <li>支持文件格式：PDF、Word、PPT、Excel、Markdown、TXT</li>
            <li>单文件大小限制：50 MB</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">用户责任</h2>
          <p>你对上传的文件内容负责。请勿上传违法、侵权或不当内容。AI Drive 有权在发现违规内容时暂停或终止你的账号。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">AI 回答免责</h2>
          <p>AI 的回答基于你上传的文档内容生成，可能存在不准确或遗漏。AI Drive 不对 AI 回答的准确性做任何保证。重要决策请以原始文档为准。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">服务变更</h2>
          <p>AI Drive 保留随时修改服务功能、定价和使用条款的权利。重大变更会提前通知注册用户。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">联系方式</h2>
          <p>如有任何问题，请联系 support@verrrnm.cloud。</p>
        </section>
      </div>
      </div>
    </div>
  )
}
