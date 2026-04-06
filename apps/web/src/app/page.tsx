"use client"

import Link from "next/link"
import { useRef, useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Upload,
  Search,
  MessageSquare,
  History,
  Command,
  Brain,
  Shield,
  Quote,
  ArrowRight,
  ChevronRight,
  Globe,
} from "lucide-react"

function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Fallback: show after 800ms even if observer doesn't fire
    const timer = setTimeout(() => setVisible(true), 800)
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); clearTimeout(timer) } },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => { obs.disconnect(); clearTimeout(timer) }
  }, [])
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------- page ---------- */

const STEPS = [
  { icon: Upload, title: "上传文件", desc: "拖拽或选择你的 PDF、Word、PPT、Excel、TXT、Markdown 文件" },
  { icon: Search, title: "AI 自动索引", desc: "AI 自动解析文件内容，建立知识图谱" },
  { icon: MessageSquare, title: "对话提问", desc: "用自然语言提问，获得精准答案" },
] as const

const FEATURES = [
  { icon: MessageSquare, title: "AI 对话", desc: "问你的 AI 任何关于你文件的问题，获得基于文档内容的精准回答。就像拥有一个读过你所有资料的私人助手。", reverse: false },
  { icon: Quote, title: "引用来源", desc: "每个回答都标注来自哪个文件、哪一段。让你对答案的准确性充满信心，随时可以回溯原文验证。", reverse: true },
  { icon: History, title: "对话历史", desc: "所有对话自动保存，随时回顾。你的每一次提问和 AI 的每一次回答都被完整记录。", reverse: false },
  { icon: Command, title: "全文搜索", desc: "⌘K 一键搜索所有文件内容。瞬间在海量文档中找到你需要的信息。", reverse: true },
] as const

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#1C1B18] selection:bg-[#4F5BD5]/30">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#E5E4E1] bg-white/80 px-6 py-4 backdrop-blur">
        <Link href="/" className="text-lg font-bold text-[#1C1B18]">AI Drive</Link>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">功能</a>
          <Link href="/login" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">登录</Link>
          <Link href="/signup" className="rounded-lg bg-[#4F5BD5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3D49C4] transition">免费开始</Link>
        </div>
      </nav>

      {/* ===== grid bg ===== */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,91,213,.1),transparent)]" />

      {/* ===== Hero ===== */}
      <section className="relative z-10 flex min-h-[90vh] flex-col items-center justify-center bg-gradient-to-b from-[#F4F5FD] to-white px-6 text-center">
        <FadeIn>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            让 AI 记住你的一切
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#6B6966] sm:text-xl">
            上传你的文档，AI 帮你记忆、理解、随时回答。你的个人 AI 知识库。
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/signup">免费开始 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 border-[#E5E4E1] px-8 text-base text-[#6B6966] hover:bg-[#F8F7F5] hover:text-[#1C1B18]">
              <Link href="#features">了解更多</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-8 text-base text-[#6B6966] hover:text-[#1C1B18]">
              <Link href="/login">体验 Demo →</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#6B6966] text-center">✨ 免费 5GB 存储 · 每天 50 次 AI 对话 · 无需信用卡</p>
        </FadeIn>
      </section>

      {/* ===== Product Preview ===== */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-5xl" style={{ perspective: "1200px" }}>
          <div className="rounded-xl border border-[#E5E4E1] bg-white p-1 shadow-2xl shadow-[#4F5BD5]/10 ring-1 ring-[#4F5BD5]/10" style={{ transform: "rotateX(2deg)" }}>
            <div className="flex items-center gap-1.5 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-[#6B6966]">drive.verrrnm.cloud</span>
            </div>
                        <img src="/screenshots/dashboard.png" alt="AI Drive Dashboard" className="w-full rounded-b-lg" />
          </div>
        </div>
      </section>

      {/* Value Cards section removed — AI Feature Showcase below is more specific */}

      {/* ===== AI Feature Showcase ===== */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">AI 让你的文件更智能</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[#6B6966]">不只是存储，更是理解。AI Drive 让每个文件都成为可交互的知识。</p>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            <div className="group rounded-2xl border border-[#E5E4E1] bg-white p-8 backdrop-blur transition hover:border-[#4F5BD5]/30 hover:bg-[#F8F7F5]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F5BD5]/20 to-purple-500/20 mb-4">
                <Brain className="h-6 w-6 text-[#4F5BD5]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI 智能摘要</h3>
              <p className="text-[#6B6966] leading-relaxed">上传文件自动生成摘要，不用阅读全文就能了解核心内容</p>
            </div>
            <div className="group rounded-2xl border border-[#E5E4E1] bg-white p-8 backdrop-blur transition hover:border-[#4F5BD5]/30 hover:bg-[#F8F7F5]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                <MessageSquare className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">跨文件问答</h3>
              <p className="text-[#6B6966] leading-relaxed">同时问 AI 多个文件的内容，获得跨文档的综合分析</p>
            </div>
            <div className="group rounded-2xl border border-[#E5E4E1] bg-white p-8 backdrop-blur transition hover:border-[#4F5BD5]/30 hover:bg-[#F8F7F5]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-[#4F5BD5]/20 mb-4">
                <Globe className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">知识时间线</h3>
              <p className="text-[#6B6966] leading-relaxed">按时间轴浏览你的知识积累，清晰回顾学习与成长的脉络</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ===== How It Works ===== */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">看看 AI Drive 如何工作</h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <ChevronRight className="absolute -right-5 top-8 hidden h-6 w-6 text-[#6B6966] sm:block" />
                )}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F5BD5]/10 text-[#4F5BD5]">
                  <s.icon className="h-7 w-7" />
                </div>
                <span className="mt-2 text-xs font-medium text-[#6B6966]">步骤 {i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-[#6B6966]">{s.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ===== Feature Highlights ===== */}
      <section className="relative z-10 mx-auto max-w-6xl space-y-32 px-6 py-24">
        {FEATURES.map((f) => (
          <FadeIn key={f.title}>
            <div className={`flex flex-col items-center gap-12 md:flex-row ${f.reverse ? "md:flex-row-reverse" : ""}`}>
              {/* text */}
              <div className="flex-1 space-y-4">
                <f.icon className="h-8 w-8 text-[#4F5BD5]" />
                <h3 className="text-2xl font-bold sm:text-3xl">{f.title}</h3>
                <p className="text-[#6B6966] leading-relaxed">{f.desc}</p>
              </div>
              {/* real screenshot */}
              <div className="w-full flex-1 overflow-hidden rounded-2xl border border-[#E5E4E1] ring-1 ring-black/5 shadow-lg">
                <img
                  src={f.title === "AI 对话" || f.title === "引用来源" ? "/screenshots/chat.png" : "/screenshots/dashboard.png"}
                  alt={f.title}
                  className="w-full rounded-2xl"
                />
              </div>
            </div>
          </FadeIn>
        ))}
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative z-10 px-6 py-32 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold sm:text-4xl">准备好了吗？让 AI 记住你的一切</h2>
          <div className="mt-8">
            <Button asChild size="lg" className="h-12 px-10 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/signup">免费开始 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#6B6966]">✨ 免费 5GB 存储 · 每天 50 次 AI 对话 · 无需信用卡</p>
        </FadeIn>
      </section>

      {/* ===== Footer ===== */}
      <footer className="relative z-10 border-t border-[#E5E4E1] bg-[#F8F7F5] px-6 py-8 text-center text-sm text-[#6B6966]">
        © 2026 AI Drive · <Link href="/privacy" className="text-[#6B6966] hover:text-[#1C1B18] text-sm">隐私政策</Link> · <Link href="/terms" className="text-[#6B6966] hover:text-[#1C1B18] text-sm">使用条款</Link>
      </footer>
    </main>
  )
}
