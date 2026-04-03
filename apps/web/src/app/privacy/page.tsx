export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">数据隐私政策</h1>
      <p className="mt-4 text-muted-foreground">最后更新：2026 年 4 月</p>
      
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">数据隔离</h2>
          <p>每个用户的文件和对话完全隔离存储。你的数据只有你能访问。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">不共享第三方</h2>
          <p>我们不会将你的文件内容或对话数据共享给任何第三方。AI 分析仅在你的账户范围内进行。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">数据导出</h2>
          <p>你可以随时在设置页面导出所有数据（文件 + 对话历史），格式为 ZIP 压缩包。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">账号删除</h2>
          <p>你可以随时在设置页面删除账号。删除后所有数据将被永久移除，不可恢复。</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">联系我们</h2>
          <p>如有任何隐私相关问题，请联系 privacy@verrrnm.cloud。</p>
        </section>
      </div>
    </div>
  )
}
