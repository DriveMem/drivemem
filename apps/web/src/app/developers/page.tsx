"use client"

import Link from "next/link"
import { useRef, useEffect, useState, useCallback, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Search, FileText, Plug, Bell, ArrowRight, ChevronRight, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import ApiPlayground from "./api-playground"

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

const TABS = ["REST API", "MCP 配置", "Webhook", "Try it"] as const

const CODE_BLOCKS = [
  `# 1. 获取 API Key（Settings → API Keys）

# 2. 语义搜索
curl -X GET 'https://drivemem.cloud/api/v1/search?q=项目最新进展' \\
  -H 'Authorization: Bearer YOUR_API_KEY'

# 响应示例：
# {
#   "results": [
#     {
#       "fileId": "abc-123",
#       "fileName": "项目周报.md",
#       "text": "本周完成了用户认证模块...",
#       "score": 0.92
#     }
#   ]
# }

# 3. 存入知识
curl -X POST https://drivemem.cloud/api/v1/store \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"content": "今天决定采用方案 A", "title": "决策记录"}'

# 响应示例：
# {
#   "id": "def-456",
#   "name": "note-2026-04-09.md",
#   "status": "pending"
# }`,

  `{
  "mcpServers": {
    "ai-drive": {
      // 公网: https://api.drivemem.cloud/mcp
      // 本地: http://localhost:3000/mcp
      "url": "https://api.drivemem.cloud/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,

  `# 注册 Webhook 接收事件推送
curl -X POST https://drivemem.cloud/api/webhooks \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"url": "https://your-app.com/hook", "events": ["file.indexed", "insight.discovered"]}'

# 支持的事件类型：
# - file.indexed     文件上传并完成 AI 索引
# - insight.discovered  AI 发现新知识关联
# - file.deleted     文件被删除

# 响应示例：
# { "id": "...", "url": "...", "events": [...], "secret": "..." }
# 用 secret 验证签名：X-AIDrive-Signature: sha256=<HMAC(secret, body)>`,
]

const MCP_TOOLS = [
  "search", "ask", "list_files", "file_detail",
  "insights", "suggest", "timeline", "upload", "store",
]

/* ---------- Webhook Delivery Log ---------- */

interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  url: string
  statusCode: number | null
  success: boolean
  duration: number | null
  error: string | null
  createdAt: string
}

const EVENT_BADGE_COLORS: Record<string, string> = {
  "file.indexed": "bg-blue-100 text-blue-700 border-blue-200",
  "insight.discovered": "bg-purple-100 text-purple-700 border-purple-200",
  "file.deleted": "bg-red-100 text-red-700 border-red-200",
  "summary.generated": "bg-emerald-100 text-emerald-700 border-emerald-200",
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}秒前`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

function truncateUrl(url: string, max = 40): string {
  return url.length > max ? url.slice(0, max) + "…" : url
}

function WebhookDeliveryLog() {
  const { status } = useSession()
  const isLoggedIn = status === "authenticated"
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/webhooks/deliveries?limit=20")
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      const data = await res.json()
      setDeliveries(data.deliveries || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) fetchDeliveries()
  }, [isLoggedIn, fetchDeliveries])

  if (!isLoggedIn) {
    return (
      <div className="mt-8 rounded-xl border border-[#E5E4E1] bg-white p-6 text-center">
        <p className="text-sm text-[#6B6966]">登录后查看 Webhook 日志</p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1C1B18]">📋 Webhook 事件日志</h3>
        <button
          onClick={fetchDeliveries}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E4E1] px-3 py-1.5 text-xs font-medium text-[#6B6966] hover:bg-[#F8F7F5] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && deliveries.length === 0 && (
        <div className="rounded-xl border border-[#E5E4E1] bg-white p-8 text-center">
          <p className="text-sm text-[#6B6966]">
            暂无 Webhook 投递记录。注册 Webhook 后，事件触发时会在这里显示投递历史。
          </p>
        </div>
      )}

      {deliveries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#E5E4E1]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E4E1] bg-white">
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">事件</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">URL</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">状态码</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">耗时</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">时间</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E4E1]">
              {deliveries.map((d) => (
                <>
                  <tr key={d.id} className="hover:bg-white/60 transition">
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${EVENT_BADGE_COLORS[d.event] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {d.event}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-[#6B6966]" title={d.url}>
                        {truncateUrl(d.url)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {d.statusCode != null ? (
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${
                          d.statusCode >= 200 && d.statusCode < 300
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {d.statusCode}
                        </span>
                      ) : (
                        <span className="text-xs text-[#6B6966]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#6B6966] font-mono">
                      {d.duration != null ? `${d.duration}ms` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#6B6966]">
                      {relativeTime(d.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      {d.error && (
                        <button
                          onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                          className="text-[#6B6966] hover:text-[#1C1B18] transition"
                        >
                          {expandedId === d.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {d.error && expandedId === d.id && (
                    <tr key={`${d.id}-error`}>
                      <td colSpan={6} className="bg-red-50/50 px-4 py-3">
                        <p className="text-xs font-mono text-red-700 break-all">{d.error}</p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && deliveries.length === 0 && (
        <div className="rounded-xl border border-[#E5E4E1] bg-white p-8 text-center">
          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-[#6B6966]" />
          <p className="mt-2 text-sm text-[#6B6966]">加载中...</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Page ---------- */
export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [copiedClient, setCopiedClient] = useState<string | null>(null)
  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated"

  return (
    <main className="min-h-screen bg-white text-[#1C1B18] selection:bg-[#4F5BD5]/30">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#E5E4E1] bg-white/80 px-6 py-4 backdrop-blur">
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="text-lg font-bold text-[#1C1B18]">AI Drive</Link>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">功能</a>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="rounded-lg border border-[#E5E4E1] px-4 py-2 text-sm font-medium text-[#1C1B18] hover:bg-[#F8F7F5] transition">
                返回 Dashboard
              </Link>
              <Link href="/settings" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-medium text-white">
                {(session?.user?.name || "U").charAt(0).toUpperCase()}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">登录</Link>
              <Link href="/signup" className="rounded-lg bg-[#4F5BD5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3D49C4] transition">免费开始</Link>
            </>
          )}
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

            {/* Client-specific MCP templates */}
            {activeTab === 1 && (
              <div className="mt-6 space-y-4">
                {[
                  {
                    name: "Claude Desktop",
                    path: "~/Library/Application Support/Claude/claude_desktop_config.json",
                    config: `{
  "mcpServers": {
    "ai-drive": {
      // 公网: https://api.drivemem.cloud/mcp
      // 本地: http://localhost:3000/mcp
      "url": "https://api.drivemem.cloud/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,
                  },
                  {
                    name: "Cursor",
                    path: "~/.cursor/mcp.json",
                    config: `{
  "mcpServers": {
    "ai-drive": {
      // 公网: https://api.drivemem.cloud/mcp
      // 本地: http://localhost:3000/mcp
      "url": "https://api.drivemem.cloud/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,
                  },
                  {
                    name: "OpenClaw",
                    path: "openclaw.yaml 或 TOOLS.md",
                    config: `# OpenClaw MCP 配置（openclaw.yaml）
plugins:
  entries:
    ai-drive:
      kind: mcp
      transport:
        type: sse
        # 公网: https://api.drivemem.cloud/mcp
        # 本地: http://localhost:3000/mcp
        url: "https://api.drivemem.cloud/mcp"
        headers:
          Authorization: "Bearer YOUR_API_KEY"`,
                  },
                ].map((client) => (
                  <div key={client.name} className="rounded-xl border border-[#E5E4E1] overflow-hidden">
                    <div className="flex items-center justify-between bg-white px-4 py-2 border-b border-[#E5E4E1]">
                      <div>
                        <span className="text-sm font-medium text-[#1C1B18]">{client.name}</span>
                        <span className="ml-2 text-xs text-[#6B6966]">{client.path}</span>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(client.config); setCopiedClient(client.name) ; setTimeout(() => setCopiedClient(null), 2000) }}
                        className="rounded-md border border-[#E5E4E1] px-2.5 py-1 text-xs text-[#6B6966] hover:bg-[#F8F7F5] transition"
                      >
                        {copiedClient === client.name ? "✓ 已复制" : "复制"}
                      </button>
                    </div>
                    <pre className="overflow-x-auto bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
                      <code>{client.config}</code>
                    </pre>
                  </div>
                ))}
                {/* URL options */}
                <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 space-y-3">
                  <p className="text-sm font-medium text-[#1C1B18]">🌐 MCP 服务地址</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[#4F5BD5]/30 bg-[#4F5BD5]/5 p-3">
                      <p className="text-xs font-medium text-[#4F5BD5] mb-1">☁️ 公网地址（推荐）</p>
                      <code className="text-xs font-mono text-[#1C1B18] break-all">https://api.drivemem.cloud/mcp</code>
                      <p className="text-[10px] text-[#6B6966] mt-1">无需自建，直接使用</p>
                    </div>
                    <div className="rounded-lg border border-[#E5E4E1] bg-[#F8F7F5] p-3">
                      <p className="text-xs font-medium text-[#6B6966] mb-1">🏠 本地 / 自部署</p>
                      <code className="text-xs font-mono text-[#1C1B18] break-all">http://localhost:3000/mcp</code>
                      <p className="text-[10px] text-[#6B6966] mt-1">适合本地开发或私有部署</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#6B6966]">
                    💡 将 <code className="font-mono">YOUR_API_KEY</code> 替换为你的 API Key。
                    在 <a href="/settings?tab=developer" className="text-[#4F5BD5] hover:underline">Settings → 开发者</a> 创建。
                  </p>
                </div>

                {/* Security tips */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-sm font-medium text-amber-800">🔒 安全最佳实践</p>
                  <ul className="space-y-1.5 text-xs text-amber-700">
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span><strong>最小权限原则</strong> — 创建 API Key 时仅勾选所需的 scope，避免授予不必要的权限</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span><strong>使用环境变量</strong> — 不要在配置文件中硬编码 API Key，使用 <code className="font-mono bg-amber-100 px-1 rounded">$AIDRIVE_API_KEY</code> 等环境变量代替</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span><strong>定期轮换</strong> — 建议每 90 天轮换一次 API Key，及时撤销不再使用的 Key</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Code block for non-MCP tabs */}
            {activeTab !== 1 && activeTab !== 3 && (
              <div className="relative mt-6">
                <pre className="overflow-x-auto rounded-lg bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
                  <code>{CODE_BLOCKS[activeTab]}</code>
                </pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(CODE_BLOCKS[activeTab]); setCopiedClient("code"); setTimeout(() => setCopiedClient(null), 2000) }}
                  className="absolute top-2 right-2 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20 transition"
                >
                  {copiedClient === "code" ? "✓ 已复制" : "复制"}
                </button>
              </div>
            )}

            {/* Webhook Delivery Log */}
            {activeTab === 2 && <WebhookDeliveryLog />}

            {/* API Playground */}
            {activeTab === 3 && <ApiPlayground />}
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
      <section id="api" className="relative z-10 border-t border-[#E5E4E1] bg-[#F8F7F5] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-2xl font-bold sm:text-3xl">API 参考</h2>

            <div className="mt-8 space-y-6">
              {/* REST API Endpoints */}
              <div>
                <h3 className="font-semibold text-[#1C1B18]">REST API Endpoints</h3>
                <p className="mt-2 text-sm text-[#6B6966]">
                  所有 v1 端点前缀为 <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono border border-[#E5E4E1]">/api/v1</code>，需携带 API Key 认证。Webhook 端点前缀为 <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono border border-[#E5E4E1]">/api/webhooks</code>。
                </p>
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E4E1]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E4E1] bg-white">
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Method</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Path</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E4E1]">
                      {[
                        ["GET", "/api/v1/search?q=…", "语义搜索知识库"],
                        ["POST", "/api/v1/ask", "RAG 问答（基于文档的 AI 回答）"],
                        ["POST", "/api/v1/store", "快速存入一段知识笔记"],
                        ["POST", "/api/v1/files/upload", "上传文件（multipart）"],
                        ["GET", "/api/v1/files", "列出所有文件（?detail=brief|full）"],
                        ["GET", "/api/v1/files/:id", "获取文件详情"],
                        ["PATCH", "/api/v1/files/:id", "更新文件元数据（名称、标签）"],
                        ["PUT", "/api/v1/files/:id/content", "替换文件内容"],
                        ["DELETE", "/api/v1/files/:id", "删除文件"],
                        ["POST", "/api/v1/files/batch", "批量操作（delete/archive/unarchive）"],
                        ["PATCH", "/api/v1/files/:id/archive", "归档文件"],
                        ["PATCH", "/api/v1/files/:id/unarchive", "取消归档"],
                        ["GET", "/api/v1/insights", "获取 AI 洞察（文件关联与趋势）"],
                        ["GET", "/api/v1/timeline", "知识库活动时间线"],
                        ["GET", "/api/webhooks", "列出已注册的 Webhook"],
                        ["POST", "/api/webhooks", "注册新 Webhook"],
                        ["PATCH", "/api/webhooks/:id", "更新 Webhook"],
                        ["DELETE", "/api/webhooks/:id", "删除 Webhook"],
                      ].map(([method, path, desc], i) => (
                        <tr key={i} className="hover:bg-white/60 transition">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${
                              method === "GET" ? "bg-emerald-50 text-emerald-700" :
                              method === "POST" ? "bg-blue-50 text-blue-700" :
                              method === "PUT" ? "bg-amber-50 text-amber-700" :
                              method === "PATCH" ? "bg-purple-50 text-purple-700" :
                              "bg-red-50 text-red-700"
                            }`}>{method}</span>
                          </td>
                          <td className="px-4 py-2">
                            <code className="text-xs font-mono text-[#1C1B18]">{path}</code>
                          </td>
                          <td className="px-4 py-2 text-[#6B6966]">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div id="mcp">
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

              <div id="cli">
                <h3 className="font-semibold text-[#1C1B18]">CLI 工具</h3>
                <p className="mt-2 text-sm text-[#6B6966]">命令行操作知识库：</p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
                  <code>{`# 安装（Coming Soon — CLI 包即将发布到 npm）
# npm install -g aidrive-cli

# 配置 API Key
export AIDRIVE_API_KEY=ak_your_api_key

# 常用命令
aidrive search "关键词"
aidrive ask "基于文件回答问题"
aidrive store "快速存入一段知识"
aidrive upload report.md
aidrive files              # 列出文件
aidrive info <file-id>     # 文件详情 + AI 摘要
aidrive insights           # AI 洞察

# 所有命令支持 --json 输出（适合 agent/脚本）`}</code>
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
                <li><Link href="/developers#api" className="hover:text-[#4F5BD5] transition">API 文档</Link></li>
                <li><Link href="/developers#mcp" className="hover:text-[#4F5BD5] transition">MCP 协议</Link></li>
                <li><Link href="/developers#cli" className="hover:text-[#4F5BD5] transition">CLI 工具</Link></li>
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
