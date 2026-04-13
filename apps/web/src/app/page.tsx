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
  { icon: Upload, title: "存入知识", desc: "上传文件、保存对话结论、AI 自动理解和索引" },
  { icon: Search, title: "AI 自动关联", desc: "语义搜索、跨文件洞察、自动发现知识关联" },
  { icon: MessageSquare, title: "Agent 无缝接力", desc: "任何 AI 工具接入你的知识库，任务接力不断片" },
] as const

const FEATURES = [
  { icon: MessageSquare, title: "跨 Agent 任务接力", desc: "在一个 AI 做了调研，切到另一个写方案。Context Packet 一键打包上下文，新 agent 接着做。", reverse: false },
  { icon: Lightbulb, title: "AI 主动发现关联", desc: "AI 自动分析文件间的联系、矛盾和趋势，主动推送洞察。", reverse: true },
  { icon: Quote, title: "用户档案自动同步", desc: "设置你的角色、目标和偏好，所有连接的 agent 自动获得。不用每次重新自我介绍。", reverse: false },
  { icon: FileSearch, title: "项目记忆", desc: "按项目组织知识。每个项目有简介、目标和状态，agent 连接后立即了解项目全貌。", reverse: true },
  { icon: Command, title: "MCP / API / CLI 接入", desc: "标准 MCP 协议、REST API、CLI 工具。任何 AI agent 一行配置接入。", reverse: false },
  { icon: History, title: "知识时间线", desc: "追踪所有知识活动——文件上传、AI 分析、对话结论、洞察发现。完整审计轨迹。", reverse: true },
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
            One memory. Every agent.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#6B6966] sm:text-xl">
            一份记忆，每个 agent 都知道你。你的背景、偏好、项目 — 接入即共享。
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/signup">免费开始 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 border-[#E5E4E1] px-8 text-base text-[#6B6966] hover:bg-[#F8F7F5] hover:text-[#1C1B18]">
              <Link href="#features">了解更多</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-8 text-base text-[#6B6966] hover:text-[#1C1B18]">
              <Link href="/signup">免费试用 →</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#6B6966] text-center">✨ 免费 5GB 存储 · 每天 50 次 AI 对话 · 支持 MCP / API / CLI</p>
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
          <p className="mt-4 text-sm text-[#6B6966]">✨ 免费 5GB 存储 · 每天 50 次 AI 对话 · 支持 MCP / API / CLI</p>
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
