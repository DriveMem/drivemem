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
  Quote,
  ArrowRight,
  ChevronRight,
  Lightbulb,
  FileSearch,
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
  { icon: Search, title: "AI 自动索引", desc: "AI 自动解析文件内容，建立语义索引" },
  { icon: MessageSquare, title: "对话提问", desc: "用自然语言提问，获得精准答案" },
] as const

const FEATURES = [
  { icon: MessageSquare, title: "AI 智能对话", desc: "问你的 AI 任何关于你文件的问题，获得基于文档内容的精准回答。就像拥有一个读过你所有资料的私人助手。", reverse: false },
  { icon: Lightbulb, title: "AI 主动发现知识关联", desc: "AI 自动分析文件间的联系、矛盾和趋势，主动推送洞察给你，无需你提问。", reverse: true },
  { icon: Quote, title: "精准引用来源", desc: "每个回答都标注来自哪个文件、哪一段。让你对答案的准确性充满信心，随时可以回溯原文验证。", reverse: false },
  { icon: FileSearch, title: "一键查看文件摘要", desc: "AI 自动生成文件摘要、提取关键信息，无需逐页阅读。一眼掌握文件核心内容。", reverse: true },
  { icon: Command, title: "全文语义搜索", desc: "⌘K 一键搜索所有文件内容。不只是关键词匹配，AI 理解你的意思，在海量文档中找到真正相关的信息。", reverse: false },
  { icon: History, title: "对话历史记录", desc: "所有对话自动保存，随时回顾。你的每一次提问和 AI 的每一次回答都被完整记录。", reverse: true },
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
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
            你的 AI 知识助手
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#6B6966] sm:text-xl">
            上传文件，AI 自动理解。随时提问，AI 用你的知识回答。
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/signup">免费开始 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 border-[#E5E4E1] px-8 text-base text-[#6B6966] hover:bg-[#F8F7F5] hover:text-[#1C1B18]">
              <Link href="#features">了解更多</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-8 text-base text-[#6B6966] hover:text-[#1C1B18]">
              <Link href="/login?demo=true">免费试用 →</Link>
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
              <span className="ml-2 text-xs text-[#6B6966]">drivemem.cloud</span>
            </div>
                        <img src="/screenshots/dashboard.png" alt="AI Drive Dashboard" className="w-full rounded-b-lg" />
          </div>
        </div>
      </section>

      {/* Value Cards section removed — AI Feature Showcase below is more specific */}

      {/* ===== Scenario Cards ===== */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">每个人都能用 AI Drive</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[#6B6966]">无论你是学生、职场人还是研究者，AI Drive 都能帮你更高效地使用知识。</p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: "📄", title: "学生写论文", desc: "上传参考文献，AI 帮你找关键论点、对比不同作者观点" },
              { emoji: "💼", title: "职场人做汇报", desc: "上传项目文档，一键生成分析报告，数据引用有据可查" },
              { emoji: "🔬", title: "研究员做调研", desc: "上传多篇论文，AI 自动发现观点关联和数据矛盾" },
              { emoji: "📊", title: "创业者做竞品分析", desc: "上传竞品资料，AI 对比分析差异，生成结构化报告" },
              { emoji: "🤖", title: "AI 开发者", desc: "通过 API 和 MCP 协议，让你的 AI agent 接入个人知识库" },
              { emoji: "📚", title: "终身学习者", desc: "所有笔记和资料统一管理，AI 帮你建立知识体系" },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-[#E5E4E1] bg-white p-6 transition hover:shadow-lg hover:shadow-black/5">
                <span className="text-3xl">{s.emoji}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-[#6B6966] leading-relaxed">{s.desc}</p>
              </div>
            ))}
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

      {/* ===== Feature Highlights (2x3 Grid) ===== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <h2 className="text-3xl font-bold text-center text-[#1C1B18] mb-4">核心功能</h2>
          <p className="text-center text-[#6B6966] mb-12 max-w-2xl mx-auto">AI Drive 不只是存储，更是理解你的知识</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-xl border border-[#E5E4E1] bg-white p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4F5BD5]/10 mb-4">
                  <f.icon className="h-6 w-6 text-[#4F5BD5]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1B18] mb-2">{f.title}</h3>
                <p className="text-sm text-[#6B6966] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
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

      {/* ===== Footer (4-column) ===== */}
      <footer className="relative z-10 border-t border-[#E5E4E1] bg-[#F8F7F5]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <h3 className="text-lg font-bold text-[#1C1B18]">AI Drive</h3>
              <p className="mt-2 text-sm text-[#6B6966]">你的 AI 知识助手</p>
            </div>

            {/* 产品 */}
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">产品</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><a href="#features" className="hover:text-[#4F5BD5] transition">功能介绍</a></li>
                <li><Link href="/login" className="hover:text-[#4F5BD5] transition">登录</Link></li>
                <li><Link href="/signup" className="hover:text-[#4F5BD5] transition">免费注册</Link></li>
              </ul>
            </div>

            {/* 开发者 */}
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">开发者</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/developers#api" className="hover:text-[#4F5BD5] transition">API 文档</Link></li>
                <li><Link href="/developers#mcp" className="hover:text-[#4F5BD5] transition">MCP 协议</Link></li>
                <li><Link href="/developers#cli" className="hover:text-[#4F5BD5] transition">CLI 工具</Link></li>
              </ul>
            </div>

            {/* 法律 */}
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">法律</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/terms" className="hover:text-[#4F5BD5] transition">使用条款</Link></li>
                <li><Link href="/privacy" className="hover:text-[#4F5BD5] transition">隐私政策</Link></li>
              </ul>
            </div>
          </div>

          {/* 版权 */}
          <div className="mt-8 border-t border-[#E5E4E1] pt-6 text-center text-xs text-[#6B6966]">
            © {new Date().getFullYear()} AI Drive. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
