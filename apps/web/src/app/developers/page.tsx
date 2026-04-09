"use client"

import Link from "next/link"
import { useRef, useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Search, FileText, Plug, Bell, ArrowRight, ChevronRight } from "lucide-react"

/* ---------- FadeIn ---------- */
function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
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

/* ---------- Data ---------- */
const CAPABILITIES = [
  { icon: Search, emoji: "🔍", title: "语义搜索", desc: "自然语言检索知识库，找到真正相关的内容" },
  { icon: FileText, emoji: "🤖", title: "RAG 问答", desc: "基于知识库的 AI 问答，自动引用来源生成结构化回答" },
  { icon: Plug, emoji: "📝", title: "知识存储", desc: "agent 自动存入笔记、分析结论、决策记录" },
  { icon: Bell, emoji: "💡", title: "AI 洞察", desc: "AI 主动发现文件间的关联、矛盾和趋势" },
] as const

const TABS = ["REST API", "MCP 配置", "Webhook"] as const

const CODE_BLOCKS = [
  `# 1. 获取 API Key（Settings → API Keys）

# 2. 语义搜索
curl -X GET 'https://drive.verrrnm.cloud/api/v1/search?q=项目最新进展' \\
  -H 'Authorization: Bearer YOUR_API_KEY'

# 3. 存入知识
curl -X POST https://drive.verrrnm.cloud/api/v1/store \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"content": "今天决定采用方案 A", "title": "决策记录"}'`,

  `{
  "mcpServers": {
    "ai-drive": {
      "url": "https://drive.verrrnm.cloud/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,

  `# 注册 webhook（即将推出）
curl -X POST https://drive.verrrnm.cloud/api/v1/webhooks \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"url": "https://your-app.com/hook", "events": ["insight.created", "file.indexed"]}'`,
]

const MCP_TOOLS = [
  "search", "ask", "list_files", "file_detail",
  "insights", "suggest", "timeline", "upload", "store",
]

/* ---------- Page ---------- */
export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <main className="min-h-screen bg-white text-[#1C1B18] selection:bg-[#4F5BD5]/30">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#E5E4E1] bg-white/80 px-6 py-4 backdrop-blur">
        <Link href="/" className="text-lg font-bold text-[#1C1B18]">AI Drive</Link>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">功能</a>
          <Link href="/login" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">登录</Link>
          <Link href="/signup" className="rounded-lg bg-[#4F5BD5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3D49C4] transition">免费开始</Link>
        </div>
      </nav>

      {/* Grid bg */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,91,213,.1),transparent)]" />

      {/* Hero */}
      <section className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center bg-gradient-to-b from-[#F4F5FD] to-white px-6 text-center">
        <FadeIn>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            让你的 Agent 拥有记忆
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[#6B6966]">
            AI Drive 是 agent 的知识基建 — 通过 API 和 MCP 协议接入你的知识库
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="h-12 px-10 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <a href="#quickstart">开始使用 <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* Capabilities */}
      <section id="features" className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">核心能力</h2>
          <p className="mt-4 text-center text-[#6B6966]">一套完整的 API，让你的应用拥有 AI 知识能力</p>
        </FadeIn>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {CAPABILITIES.map((c, i) => (
            <FadeIn key={i}>
              <div className="flex gap-4 rounded-xl border border-[#E5E4E1] p-6 hover:shadow-sm transition">
                <span className="text-3xl">{c.emoji}</span>
                <div>
                  <h3 className="font-semibold text-[#1C1B18]">{c.title}</h3>
                  <p className="mt-1 text-sm text-[#6B6966]">{c.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="relative z-10 bg-[#F8F7F5] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">快速接入</h2>
            <p className="mt-4 text-center text-[#6B6966]">三步接入 AI Drive</p>

            {/* Step guide */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-bold text-white">1</span>
                <p className="mt-2 text-sm font-medium">获取 API Key</p>
                <p className="mt-1 text-xs text-[#6B6966]">在 <a href="/settings?tab=developer" className="text-[#4F5BD5] hover:underline">Settings</a> 创建你的 Key</p>
              </div>
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-bold text-white">2</span>
                <p className="mt-2 text-sm font-medium">复制配置</p>
                <p className="mt-1 text-xs text-[#6B6966]">选择 REST API 或 MCP 配置</p>
              </div>
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-bold text-white">3</span>
                <p className="mt-2 text-sm font-medium">粘贴使用</p>
                <p className="mt-1 text-xs text-[#6B6966]">粘贴到 Claude / Cursor / 你的应用</p>
              </div>
            </div>
          </FadeIn>

          <FadeIn className="mt-12">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#E5E4E1]">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`pb-3 text-sm font-medium transition ${
                    activeTab === i
                      ? "border-b-2 border-[#4F5BD5] text-[#1C1B18]"
                      : "text-[#6B6966] hover:text-[#1C1B18]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Client hint for MCP tab */}
            {activeTab === 1 && (
              <p className="mt-6 mb-2 text-sm text-[#6B6966]">
                将以下配置添加到你的 MCP 客户端配置文件中：
                <span className="block mt-1">
                  • <strong>Claude Desktop</strong>: <code className="rounded bg-[#F8F7F5] px-1 text-xs font-mono">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                </span>
                <span className="block">
                  • <strong>Cursor</strong>: <code className="rounded bg-[#F8F7F5] px-1 text-xs font-mono">~/.cursor/mcp.json</code>
                </span>
                <span className="block">
                  • <strong>OpenClaw</strong>: 参考 <a href="#quickstart" className="text-[#4F5BD5] hover:underline">接入文档</a>
                </span>
              </p>
            )}

            {/* Code block */}
            <pre className={`${activeTab === 1 ? "mt-2" : "mt-6"} overflow-x-auto rounded-lg bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]`}>
              <code>{CODE_BLOCKS[activeTab]}</code>
            </pre>
          </FadeIn>
        </div>
      </section>

      {/* API Key Guide */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
        <FadeIn>
          <h2 className="text-2xl font-bold sm:text-3xl">获取 API Key</h2>
          <p className="mt-4 text-[#6B6966]">
            在 Settings 页面创建你的 API Key，即可开始集成。
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/settings?tab=developer">前往创建 API Key <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* API Reference */}
      <section className="relative z-10 border-t border-[#E5E4E1] bg-[#F8F7F5] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-2xl font-bold sm:text-3xl">API 参考</h2>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-semibold text-[#1C1B18]">MCP 工具列表</h3>
                <p className="mt-2 text-sm text-[#6B6966]">
                  AI Drive MCP Server 提供 {MCP_TOOLS.length} 个工具：
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MCP_TOOLS.map((t) => (
                    <code key={t} className="rounded bg-white px-2 py-1 text-xs font-mono text-[#4F5BD5] border border-[#E5E4E1]">
                      {t}
                    </code>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-[#1C1B18]">CLI 工具</h3>
                <p className="mt-2 text-sm text-[#6B6966]">通过命令行快速访问知识库：</p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
                  <code>{`aidrive search "关键词"
aidrive ask "基于文件回答问题"
aidrive store "快速存入一段知识"
aidrive upload report.md`}</code>
                </pre>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E5E4E1] bg-[#F8F7F5]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold text-[#1C1B18]">AI Drive</h3>
              <p className="mt-2 text-sm text-[#6B6966]">你的 AI 知识助手</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">产品</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><a href="#features" className="hover:text-[#4F5BD5] transition">功能介绍</a></li>
                <li><Link href="/login" className="hover:text-[#4F5BD5] transition">登录</Link></li>
                <li><Link href="/signup" className="hover:text-[#4F5BD5] transition">免费注册</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">开发者</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/developers" className="hover:text-[#4F5BD5] transition">API 文档</Link></li>
                <li><a href="#quickstart" className="hover:text-[#4F5BD5] transition">MCP 协议</a></li>
                <li><a href="#quickstart" className="hover:text-[#4F5BD5] transition">CLI 工具</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">法律</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/terms" className="hover:text-[#4F5BD5] transition">使用条款</Link></li>
                <li><Link href="/privacy" className="hover:text-[#4F5BD5] transition">隐私政策</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-[#E5E4E1] pt-6 text-center text-xs text-[#6B6966]">
            © {new Date().getFullYear()} AI Drive. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
