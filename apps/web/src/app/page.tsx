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

const VALUE_CARDS = [
  { icon: Brain, title: "智能理解", desc: "上传 PDF、Markdown、TXT，AI 自动解析内容" },
  { icon: MessageSquare, title: "精准回答", desc: "基于你的文档回答问题，每个答案都有来源引用" },
  { icon: Shield, title: "数据隔离", desc: "你的文件只属于你，完全隔离存储" },
] as const

const STEPS = [
  { icon: Upload, title: "上传文件", desc: "拖拽或选择你的 PDF、Markdown、TXT 文件" },
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
    <main className="min-h-screen bg-gray-950 text-white selection:bg-blue-500/30">
      {/* ===== grid bg ===== */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,.15),transparent)]" />

      {/* ===== Hero ===== */}
      <section className="relative z-10 flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
        <FadeIn>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            让 AI 记住你的一切
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">
            上传你的文档，AI 帮你记忆、理解、随时回答。你的个人 AI 知识库。
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/signup">免费开始 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 border-gray-700 px-8 text-base text-gray-300 hover:bg-gray-800 hover:text-white">
              <Link href="#features">了解更多</Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* ===== Product Preview ===== */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-5xl" style={{ perspective: "1200px" }}>
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-1 shadow-2xl shadow-blue-500/10" style={{ transform: "rotateX(2deg)" }}>
            <div className="flex items-center gap-1.5 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-gray-500">drive.verrrnm.cloud</span>
            </div>
            <div className="aspect-[16/9] rounded-lg bg-gray-950 flex items-center justify-center text-gray-600">
              <div className="w-full h-full p-4 flex gap-4">
                <div className="w-48 border-r border-gray-800 pr-4 space-y-3">
                  <div className="h-3 w-20 rounded bg-gray-800" />
                  <div className="h-3 w-28 rounded bg-gray-800" />
                  <div className="h-3 w-24 rounded bg-gray-800" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-40 rounded bg-gray-800" />
                      <div className="h-2.5 w-32 rounded bg-gray-800/60" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-3">
                      <div className="h-6 w-6 rounded bg-red-500/30" />
                      <div className="h-3 w-48 rounded bg-gray-800" />
                      <div className="ml-auto h-3 w-16 rounded bg-gray-800/60" />
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-3">
                      <div className="h-6 w-6 rounded bg-green-500/30" />
                      <div className="h-3 w-56 rounded bg-gray-800" />
                      <div className="ml-auto h-3 w-16 rounded bg-gray-800/60" />
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-3">
                      <div className="h-6 w-6 rounded bg-blue-500/30" />
                      <div className="h-3 w-44 rounded bg-gray-800" />
                      <div className="ml-auto h-3 w-16 rounded bg-gray-800/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Value Cards ===== */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <div className="grid gap-6 sm:grid-cols-3">
            {VALUE_CARDS.map((c) => (
              <div key={c.title} className="group rounded-2xl border border-gray-800 bg-gray-900/60 p-8 backdrop-blur transition hover:border-gray-700 hover:bg-gray-900/80">
                <c.icon className="mb-4 h-8 w-8 text-blue-400" />
                <h3 className="text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{c.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ===== How It Works ===== */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">看看 AI Drive 如何工作</h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <ChevronRight className="absolute -right-5 top-8 hidden h-6 w-6 text-gray-600 sm:block" />
                )}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                  <s.icon className="h-7 w-7" />
                </div>
                <span className="mt-2 text-xs font-medium text-gray-500">步骤 {i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{s.desc}</p>
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
                <f.icon className="h-8 w-8 text-blue-400" />
                <h3 className="text-2xl font-bold sm:text-3xl">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
              {/* placeholder card */}
              <div className="flex h-56 w-full flex-1 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/50">
                <f.icon className="h-16 w-16 text-gray-700" />
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
            <Button asChild size="lg" className="h-12 px-10 text-base bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/signup">免费开始 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* ===== Footer ===== */}
      <footer className="relative z-10 border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-500">
        © 2026 AI Drive
      </footer>
    </main>
  )
}
