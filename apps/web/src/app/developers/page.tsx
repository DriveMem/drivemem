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
  { icon: Search, emoji: "🔍", title: "Semantic search", desc: "Natural language search across your knowledge base" },
  { icon: FileText, emoji: "🤖", title: "RAG Q&A", desc: "AI answers grounded in your files, with cited sources" },
  { icon: Plug, emoji: "📝", title: "Knowledge storage", desc: "Agents auto-save notes, analysis, and decisions" },
  { icon: Bell, emoji: "💡", title: "AI Insights", desc: "AI discovers connections, contradictions, and trends" },
] as const

const TABS = ["REST API", "MCP Config", "Webhook", "Try it"] as const

const CODE_BLOCKS = [
  `# 1. Get API Key (Settings → API Keys)

# 2. Semantic search
curl -X GET 'https://drivemem.cloud/api/v1/search?q=latest%20updates' \\
  -H 'Authorization: Bearer YOUR_API_KEY'

# Response:
# {
#   "results": [
#     {
#       "fileId": "abc-123",
#       "fileName": "weekly-report.md",
#       "text": "Completed user auth module this week...",
#       "score": 0.92
#     }
#   ]
# }

# 3. Store knowledge
curl -X POST https://drivemem.cloud/api/v1/store \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"content": "Decision: adopting plan A", "title": "Decision log"}'

# Response:
# {
#   "id": "def-456",
#   "name": "note-2026-04-09.md",
#   "status": "pending"
# }`,

  `{
  "mcpServers": {
    "ai-drive": {
      // Public: https://api.drivemem.cloud/mcp
      // Local: http://localhost:3000/mcp
      "url": "https://api.drivemem.cloud/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,

  `# Register webhook for event notifications
curl -X POST https://drivemem.cloud/api/webhooks \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"url": "https://your-app.com/hook", "events": ["file.indexed", "insight.discovered"]}'

# Supported events:
# - file.indexed     File uploaded and AI-indexed
# - insight.discovered  AI discovered new knowledge link
# - file.deleted     File deleted

# Response:
# { "id": "...", "url": "...", "events": [...], "secret": "..." }
# Verify signature with secret：X-AIDrive-Signature: sha256=<HMAC(secret, body)>`,
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
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      setDeliveries(data.deliveries || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
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
        <p className="text-sm text-[#6B6966]">Sign in to view webhook logs</p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1C1B18]">📋 Webhook Event Log</h3>
        <button
          onClick={fetchDeliveries}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E4E1] px-3 py-1.5 text-xs font-medium text-[#6B6966] hover:bg-[#F8F7F5] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
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
            No webhook deliveries yet. Events will appear here after you register a webhook.
          </p>
        </div>
      )}

      {deliveries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#E5E4E1]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E4E1] bg-white">
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Event</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">URL</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Duration</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Time</th>
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
          <p className="mt-2 text-sm text-[#6B6966]">Loading...</p>
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
          <a href="#features" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">Features</a>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="rounded-lg border border-[#E5E4E1] px-4 py-2 text-sm font-medium text-[#1C1B18] hover:bg-[#F8F7F5] transition">
                Back to Dashboard
              </Link>
              <Link href="/settings" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-medium text-white">
                {(session?.user?.name || "U").charAt(0).toUpperCase()}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">Sign in</Link>
              <Link href="/signup" className="rounded-lg bg-[#4F5BD5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3D49C4] transition">Get started free</Link>
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
            Give your agents memory
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[#6B6966]">
            DriveMem is the knowledge infrastructure for agents — connect via API and MCP
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="h-12 px-10 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <a href="#quickstart">Get started <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* Capabilities */}
      <section id="features" className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Core capabilities</h2>
          <p className="mt-4 text-center text-[#6B6966]">A complete API to give your app AI knowledge</p>
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
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Quick start</h2>
            <p className="mt-4 text-center text-[#6B6966]">Three steps to connect</p>

            {/* Step guide */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-bold text-white">1</span>
                <p className="mt-2 text-sm font-medium">Get API Key</p>
                <p className="mt-1 text-xs text-[#6B6966]">Create your key in <a href="/settings?tab=developer" className="text-[#4F5BD5] hover:underline">Settings</a></p>
              </div>
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-bold text-white">2</span>
                <p className="mt-2 text-sm font-medium">Copy config</p>
                <p className="mt-1 text-xs text-[#6B6966]">Choose REST API or MCP</p>
              </div>
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#4F5BD5] text-sm font-bold text-white">3</span>
                <p className="mt-2 text-sm font-medium">Paste and go</p>
                <p className="mt-1 text-xs text-[#6B6966]">Paste into Claude / Cursor / your app</p>
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
      // Public: https://api.drivemem.cloud/mcp
      // Local: http://localhost:3000/mcp
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
      // Public: https://api.drivemem.cloud/mcp
      // Local: http://localhost:3000/mcp
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
                    path: "openclaw.yaml or TOOLS.md",
                    config: `# OpenClaw MCP Config（openclaw.yaml）
plugins:
  entries:
    ai-drive:
      kind: mcp
      transport:
        type: sse
        # Public: https://api.drivemem.cloud/mcp
        # Local: http://localhost:3000/mcp
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
                        {copiedClient === client.name ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="overflow-x-auto bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
                      <code>{client.config}</code>
                    </pre>
                  </div>
                ))}
                {/* URL options */}
                <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 space-y-3">
                  <p className="text-sm font-medium text-[#1C1B18]">🌐 MCP Server</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[#4F5BD5]/30 bg-[#4F5BD5]/5 p-3">
                      <p className="text-xs font-medium text-[#4F5BD5] mb-1">☁️ Public URL (recommended)</p>
                      <code className="text-xs font-mono text-[#1C1B18] break-all">https://api.drivemem.cloud/mcp</code>
                      <p className="text-[10px] text-[#6B6966] mt-1">Ready to use, no self-hosting</p>
                    </div>
                    <div className="rounded-lg border border-[#E5E4E1] bg-[#F8F7F5] p-3">
                      <p className="text-xs font-medium text-[#6B6966] mb-1">🏠 Local / Self-hosted</p>
                      <code className="text-xs font-mono text-[#1C1B18] break-all">http://localhost:3000/mcp</code>
                      <p className="text-[10px] text-[#6B6966] mt-1">For local dev or private deployment</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#6B6966]">
                    💡 Replace <code className="font-mono">YOUR_API_KEY</code> with your API key.
                    Create one in <a href="/settings?tab=developer" className="text-[#4F5BD5] hover:underline">Settings → Developer</a>.
                  </p>
                </div>

                {/* Security tips */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-sm font-medium text-amber-800">🔒 Security Best Practices</p>
                  <ul className="space-y-1.5 text-xs text-amber-700">
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span><strong>Least privilege</strong> — Only grant the scopes your agent needs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span><strong>Use env vars</strong> — Never hardcode API keys. Use <code className="font-mono bg-amber-100 px-1 rounded">$AIDRIVE_API_KEY</code> instead</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span><strong>Rotate regularly</strong> — Rotate API keys every 90 days. Revoke unused keys promptly</span>
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
                  {copiedClient === "code" ? "✓ Copied" : "Copy"}
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
          <h2 className="text-2xl font-bold sm:text-3xl">Get API Key</h2>
          <p className="mt-4 text-[#6B6966]">
            Create your API key in Settings to start integrating.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/settings?tab=developer">Create API Key <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* API Reference */}
      <section id="api" className="relative z-10 border-t border-[#E5E4E1] bg-[#F8F7F5] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-2xl font-bold sm:text-3xl">API Reference</h2>

            <div className="mt-8 space-y-6">
              {/* REST API Endpoints */}
              <div>
                <h3 className="font-semibold text-[#1C1B18]">REST API Endpoints</h3>
                <p className="mt-2 text-sm text-[#6B6966]">
                  All v1 endpoints are prefixed with <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono border border-[#E5E4E1]">/api/v1</code>. Auth via API Key. Webhook endpoints use <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono border border-[#E5E4E1]">/api/webhooks</code>.
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
                        ["GET", "/api/v1/search?q=…", "Semantic search"],
                        ["POST", "/api/v1/ask", "RAG Q&A (AI answers from docs)"],
                        ["POST", "/api/v1/store", "Store a knowledge note"],
                        ["POST", "/api/v1/files/upload", "Upload file (multipart)"],
                        ["GET", "/api/v1/files", "List files (?detail=brief|full)"],
                        ["GET", "/api/v1/files/:id", "Get file details"],
                        ["PATCH", "/api/v1/files/:id", "Update file metadata (name, tags)"],
                        ["PUT", "/api/v1/files/:id/content", "Replace file content"],
                        ["DELETE", "/api/v1/files/:id", "Delete file"],
                        ["POST", "/api/v1/files/batch", "Batch ops (delete/archive/unarchive)"],
                        ["PATCH", "/api/v1/files/:id/archive", "Archive file"],
                        ["PATCH", "/api/v1/files/:id/unarchive", "Unarchive file"],
                        ["GET", "/api/v1/insights", "Get AI Insights"],
                        ["GET", "/api/v1/timeline", "Knowledge timeline"],
                        ["GET", "/api/webhooks", "List webhooks"],
                        ["POST", "/api/webhooks", "Register webhook"],
                        ["PATCH", "/api/webhooks/:id", "Update webhook"],
                        ["DELETE", "/api/webhooks/:id", "Delete webhook"],
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
                <h3 className="font-semibold text-[#1C1B18]">MCP Tools</h3>
                <p className="mt-2 text-sm text-[#6B6966]">
                  DriveMem MCP Server provides {MCP_TOOLS.length} tools:
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
                <h3 className="font-semibold text-[#1C1B18]">CLI Tools</h3>
                <p className="mt-2 text-sm text-[#6B6966]">CLI for your knowledge base:</p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
                  <code>{`# Install
npm install -g aidrive

# Configure API Key
export AIDRIVE_API_KEY=ak_your_api_key

# Commands
aidrive search "keyword"
aidrive ask "answer based on files"
aidrive store "save knowledge"
aidrive upload report.md
aidrive files              # list files
aidrive info <file-id>     # file details + AI summary
aidrive insights           # AI insights

# All commands support --json (for agents/scripts)`}</code>
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
              <p className="mt-2 text-sm text-[#6B6966]">The memory layer for AI agents</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><a href="#features" className="hover:text-[#4F5BD5] transition">Features</a></li>
                <li><Link href="/login" className="hover:text-[#4F5BD5] transition">Sign in</Link></li>
                <li><Link href="/signup" className="hover:text-[#4F5BD5] transition">Sign up free</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">Developers</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/developers#api" className="hover:text-[#4F5BD5] transition">API Docs</Link></li>
                <li><Link href="/developers#mcp" className="hover:text-[#4F5BD5] transition">MCP Protocol</Link></li>
                <li><Link href="/developers#cli" className="hover:text-[#4F5BD5] transition">CLI Tools</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/terms" className="hover:text-[#4F5BD5] transition">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-[#4F5BD5] transition">Privacy Policy</Link></li>
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
