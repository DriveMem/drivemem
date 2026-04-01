import Link from "next/link"
import { FileText, MessageSquare, Shield } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

const features = [
  { icon: FileText, title: "智能记忆", desc: "上传 PDF、TXT、Markdown，AI 自动理解并记住内容" },
  { icon: MessageSquare, title: "自然对话", desc: "用日常语言提问，AI 从你的文件中找到答案并标注来源" },
  { icon: Shield, title: "安全私密", desc: "你的数据只属于你，端到端加密，随时导出或删除" },
]

export default async function LandingPage() {
  const session = await auth()
  if (session) redirect("/files")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">让 AI 记住你的一切</h1>
        <p className="text-lg text-muted-foreground">上传文件，用对话的方式找到任何信息。你的个人 AI 知识库。</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">免费开始</Link>
          <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent transition-colors">登录</Link>
        </div>
      </div>
      <div className="mt-20 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg border border-border">
            <f.icon className="h-8 w-8 text-primary" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-16 text-xs text-muted-foreground">AI Drive — 你的个人 AI 数据基础平台</p>
    </div>
  )
}
