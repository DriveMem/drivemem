import Link from "next/link"
import { Button } from "@/components/ui/button"

const FEATURES = [
  { icon: "🔒", title: "安全存储", desc: "端到端加密，你的数据只属于你" },
  { icon: "🧠", title: "智能理解", desc: "AI 自动解析文件内容，建立知识索引" },
  { icon: "💬", title: "随时对话", desc: "用自然语言和你的文件对话" },
] as const

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          让 AI 记住你的一切
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          上传文件，AI 帮你记忆、理解、随时回答。你的私人知识库。
        </p>

        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/signup">开始使用</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">登录</Link>
          </Button>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6"
            >
              <span className="text-4xl">{f.icon}</span>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
