import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-8">
        <h1 className="text-6xl font-bold text-blue-600">404</h1>
        <p className="mt-4 text-xl font-semibold text-foreground">
          页面未找到
        </p>
        <p className="mt-2 text-muted-foreground">
          你访问的页面不存在或已被移动
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          返回首页
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          登录 AI Drive
        </Link>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        AI Drive — 让 AI 记住你的一切
      </p>
    </div>
  )
}
