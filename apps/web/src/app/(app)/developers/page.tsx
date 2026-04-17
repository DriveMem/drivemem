"use client"

import Link from "next/link"
import { useRef, useEffect, useState, useCallback, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Search, FileText, Plug, Bell, ArrowRight, ChevronRight, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Key, Users, Copy, Check, ExternalLink } from "lucide-react"
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
# Base URL: https://drivemem.cloud

# 2. Semantic search
curl -X GET 'https://drivemem.cloud/api/v1/search?q=latest%20updates' \\
  -H 'Authorization: Bearer YOUR_API_KEY'
# Response: { "results": [{ "fileId": "abc-123", "fileName": "weekly-report.md",
#   "text": "Completed user auth module...", "score": 0.92 }] }

# 3. RAG Q&A — AI answers grounded in your files
curl -X POST https://drivemem.cloud/api/v1/ask \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"question": "What decisions were made about the auth module?"}'
# Response: { "answer": "Based on your files...", "sources": [...] }

# 4. Store a knowledge note
curl -X POST https://drivemem.cloud/api/v1/store \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"content": "Decision: adopting plan A", "title": "Decision log", "tags": "decision"}'
# Response: { "id": "def-456", "name": "note-2026-04-09.md", "status": "pending" }

# 5. Upload a file
curl -X POST https://drivemem.cloud/api/v1/files/upload \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -F 'file=@./report.md'
# Response: { "id": "ghi-789", "name": "report.md", "status": "indexing" }

# 6. List files
curl -X GET 'https://drivemem.cloud/api/v1/files?detail=brief' \\
  -H 'Authorization: Bearer YOUR_API_KEY'
# Response: { "files": [{ "id": "...", "name": "...", "summary": "..." }] }`,

  `{
  "mcpServers": {
    "drivemem": {
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
# Verify signature with secret：X-DriveMem-Signature: sha256=<HMAC(secret, body)>`,
]

const MCP_TOOLS = [
  { name: "search", desc: "Semantic search across your knowledge base" },
  { name: "ask", desc: "RAG Q&A — AI answers grounded in your files" },
  { name: "list_files", desc: "List all files with AI-generated summaries" },
  { name: "file_detail", desc: "Get detailed info and summary for a file" },
  { name: "insights", desc: "Retrieve AI-discovered connections and trends" },
  { name: "suggest", desc: "Get suggested actions based on your knowledge" },
  { name: "timeline", desc: "View activity timeline of your knowledge base" },
  { name: "upload", desc: "Upload a file to your knowledge base" },
  { name: "store", desc: "Quickly save a note or knowledge snippet" },
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

/* ---------- CopyBlock ---------- */
function CopyBlock({ code, lang = "" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-lg bg-[#1C1B18] p-4 pr-14 font-mono text-sm text-[#E5E4E1]">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 transition"
      >
        {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
      </button>
    </div>
  )
}

/* ---------- Tutorial Step ---------- */
function TutorialStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{number}</span>
        <div className="mt-2 flex-1 w-px bg-[#E5E4E1]" />
      </div>
      <div className="pb-8 flex-1">
        <h4 className="font-semibold text-[#1C1B18] mb-3">{title}</h4>
        {children}
      </div>
    </div>
  )
}

/* ---------- MCP Client Tabs ---------- */
const MCP_CLIENTS = ["Cursor", "Claude Desktop", "OpenClaw"] as const

function McpTutorialTabs({ apiKey }: { apiKey: string }) {
  const [client, setClient] = useState(0)
  const key = apiKey || "YOUR_API_KEY"

  return (
    <div className="mt-6">
      {/* Client sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-[#F0EFED] p-1 mb-6">
        {MCP_CLIENTS.map((name, i) => (
          <button
            key={name}
            onClick={() => setClient(i)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              client === i ? "bg-white text-[#1C1B18] shadow-sm" : "text-[#6B6966] hover:text-[#1C1B18]"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Cursor tutorial */}
      {client === 0 && (
        <div>
          <TutorialStep number={1} title="Open Cursor Settings">
            <p className="text-sm text-[#6B6966]">
              Go to <strong className="text-[#1C1B18]">Cursor → Settings → MCP</strong> (or press <kbd className="rounded border border-[#E5E4E1] bg-white px-1.5 py-0.5 text-xs font-mono">Cmd+,</kbd>)
            </p>
          </TutorialStep>

          <TutorialStep number={2} title="Add MCP Server">
            <p className="text-sm text-[#6B6966] mb-3">
              Click <strong className="text-[#1C1B18]">&quot;Add new MCP server&quot;</strong> and paste this URL:
            </p>
            <CopyBlock code={`https://api.drivemem.cloud/mcp?apiKey=${key}`} />
          </TutorialStep>

          <TutorialStep number={3} title="Verify Connection">
            <p className="text-sm text-[#6B6966]">
              You should see a green status indicator ✅<br />
              DriveMem tools (<code className="text-xs font-mono bg-[#F8F7F5] px-1 rounded">search</code>, <code className="text-xs font-mono bg-[#F8F7F5] px-1 rounded">store</code>, <code className="text-xs font-mono bg-[#F8F7F5] px-1 rounded">compile</code>) will appear in your tool list.
            </p>
          </TutorialStep>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            🎉 That&apos;s it! Cursor will now automatically use your knowledge base.
          </div>
        </div>
      )}

      {/* Claude Desktop tutorial */}
      {client === 1 && (
        <div>
          <TutorialStep number={1} title="Open Config File">
            <div className="space-y-2 text-sm text-[#6B6966]">
              <div className="flex items-start gap-2">
                <span className="font-medium text-[#1C1B18] shrink-0">macOS:</span>
                <code className="text-xs font-mono bg-[#F8F7F5] px-2 py-1 rounded break-all">~/Library/Application Support/Claude/claude_desktop_config.json</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-[#1C1B18] shrink-0">Windows:</span>
                <code className="text-xs font-mono bg-[#F8F7F5] px-2 py-1 rounded break-all">%APPDATA%\Claude\claude_desktop_config.json</code>
              </div>
            </div>
          </TutorialStep>

          <TutorialStep number={2} title="Add DriveMem">
            <p className="text-sm text-[#6B6966] mb-3">Paste this into the file:</p>
            <CopyBlock code={`{
  "mcpServers": {
    "drivemem": {
      "url": "https://api.drivemem.cloud/mcp",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`} />
          </TutorialStep>

          <TutorialStep number={3} title="Restart Claude Desktop">
            <p className="text-sm text-[#6B6966]">
              Quit and reopen Claude Desktop. You should see DriveMem in the MCP tools list.
            </p>
          </TutorialStep>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            🎉 Claude will now have access to your knowledge base.
          </div>
        </div>
      )}

      {/* OpenClaw tutorial */}
      {client === 2 && (
        <div>
          <TutorialStep number={1} title="Run this command">
            <CopyBlock code={`openclaw config set mcp.servers.drivemem.url "https://api.drivemem.cloud/mcp/sse?apiKey=${key}"`} />
          </TutorialStep>

          <TutorialStep number={2} title="Restart OpenClaw">
            <p className="text-sm text-[#6B6966]">
              The agent will automatically connect to your knowledge base.
            </p>
          </TutorialStep>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            🎉 OpenClaw will now use DriveMem as its memory layer.
          </div>
        </div>
      )}

      {/* Help link */}
      <div className="mt-6 text-center">
        <a href="https://docs.drivemem.cloud" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#6B6966] hover:text-brand-500 transition">
          Need help? Check our docs <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

/* ---------- Page ---------- */
export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [copiedClient, setCopiedClient] = useState<string | null>(null)
  const { status } = useSession()
  const [apiKey, setApiKey] = useState("")

  // Fetch user's first API key for auto-filling tutorials
  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    ;(async () => {
      try {
        const { apiFetch } = await import("@/lib/api")
        const data = await apiFetch("/api/api-keys")
        // We only get keyPrefix from list; full key only available on creation
        // So we keep YOUR_API_KEY as placeholder unless we can get it
        if (!cancelled && data?.keys?.length > 0 && data.keys[0].key) {
          setApiKey(data.keys[0].key)
        }
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [status])
  // title set via layout.tsx metadata

  useEffect(() => { document.title = "Connect — DriveMem" }, [])
  return (
    <div className="flex-1 overflow-auto">

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
            <Button asChild size="lg" className="h-12 px-10 text-base bg-brand-500 hover:bg-brand-600 text-white">
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
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">1</span>
                <p className="mt-2 text-sm font-medium">Get API Key</p>
                <p className="mt-1 text-xs text-[#6B6966]">Create your key in <a href="/settings?tab=developer" className="text-brand-500 hover:underline">Settings</a></p>
              </div>
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">2</span>
                <p className="mt-2 text-sm font-medium">Copy config</p>
                <p className="mt-1 text-xs text-[#6B6966]">Choose REST API or MCP</p>
              </div>
              <div className="rounded-xl border border-[#E5E4E1] bg-white p-4 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">3</span>
                <p className="mt-2 text-sm font-medium">Paste and go</p>
                <p className="mt-1 text-xs text-[#6B6966]">Paste into Claude / Cursor / your app</p>
              </div>
            </div>
          </FadeIn>

          {/* Quick links to configuration */}
          <FadeIn className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Link href="/settings?tab=developer" className="rounded-xl border border-[#E5E4E1] p-4 hover:shadow-sm transition">
                <Key className="h-5 w-5 text-[#6B6966] mb-2" />
                <h3 className="font-medium text-sm text-[#1C1B18]">API Keys</h3>
                <p className="text-xs text-[#6B6966] mt-1">Create and manage API keys for your agents</p>
              </Link>
              <Link href="/settings?tab=developer" className="rounded-xl border border-[#E5E4E1] p-4 hover:shadow-sm transition">
                <Users className="h-5 w-5 text-[#6B6966] mb-2" />
                <h3 className="font-medium text-sm text-[#1C1B18]">Agent Profiles</h3>
                <p className="text-xs text-[#6B6966] mt-1">Configure role-based context delivery</p>
              </Link>
              <Link href="/settings?tab=developer" className="rounded-xl border border-[#E5E4E1] p-4 hover:shadow-sm transition">
                <Bell className="h-5 w-5 text-[#6B6966] mb-2" />
                <h3 className="font-medium text-sm text-[#1C1B18]">Webhooks</h3>
                <p className="text-xs text-[#6B6966] mt-1">Subscribe to knowledge change events</p>
              </Link>
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
                      ? "border-b-2 border-brand-500 text-[#1C1B18]"
                      : "text-[#6B6966] hover:text-[#1C1B18]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* MCP Config — Step-by-step tutorials */}
            {activeTab === 1 && <McpTutorialTabs apiKey={apiKey} />}

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
            <Button asChild size="lg" className="h-12 px-8 text-base bg-brand-500 hover:bg-brand-600 text-white">
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
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E4E1]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E4E1] bg-white">
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Tool</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E4E1]">
                      {MCP_TOOLS.map((t) => (
                        <tr key={t.name} className="hover:bg-white/60 transition">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono text-brand-500 border border-[#E5E4E1]">{t.name}</code>
                          </td>
                          <td className="px-4 py-2 text-[#6B6966]">{t.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Codes */}
              <div>
                <h3 className="font-semibold text-[#1C1B18]">Error Codes</h3>
                <p className="mt-2 text-sm text-[#6B6966]">
                  All API and MCP errors return a JSON body with <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono border border-[#E5E4E1]">error</code> and <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono border border-[#E5E4E1]">message</code> fields.
                </p>
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E4E1]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E4E1] bg-white">
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Status</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Error</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-[#1C1B18]">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E4E1]">
                      {[
                        ["401", "Unauthorized", "Missing or invalid API key"],
                        ["403", "Forbidden", "API key lacks required scope for this action"],
                        ["404", "Not Found", "Resource does not exist or has been deleted"],
                        ["429", "Rate Limited", "Too many requests — back off and retry after the Retry-After header"],
                        ["500", "Internal Server Error", "Unexpected server error — please retry or contact support"],
                      ].map(([code, error, desc]) => (
                        <tr key={code} className="hover:bg-white/60 transition">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${
                              code === "401" || code === "403" ? "bg-amber-50 text-amber-700" :
                              code === "404" ? "bg-gray-100 text-gray-700" :
                              code === "429" ? "bg-orange-50 text-orange-700" :
                              "bg-red-50 text-red-700"
                            }`}>{code}</span>
                          </td>
                          <td className="px-4 py-2 font-medium text-[#1C1B18]">{error}</td>
                          <td className="px-4 py-2 text-[#6B6966]">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div id="cli">
                <h3 className="font-semibold text-[#1C1B18]">CLI Tools</h3>
                <p className="mt-2 text-sm text-[#6B6966]">
                  The <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono border border-[#E5E4E1]">drivemem</code> CLI lets you interact with your knowledge base from the terminal.
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
                  <code>{`# Install globally from npm
npm install -g drivemem

# Configure your API key
export DRIVEMEM_API_KEY=ak_your_api_key
# Or pass inline: drivemem --key ak_... search "query"

# Semantic search
drivemem search "latest project updates"

# RAG Q&A — ask questions answered by your files
drivemem ask "What were the key decisions last week?"

# Store a knowledge note
drivemem store "Decided to use PostgreSQL for persistence" --title "DB decision" --tags decision

# Upload a file
drivemem upload ./meeting-notes.md

# List all files with AI summaries
drivemem files

# Get file details and AI summary
drivemem info <file-id>

# View AI-discovered insights
drivemem insights

# View activity timeline
drivemem timeline

# Generate a project context packet
drivemem pack <folder-id>

# All commands support --json for scripting
drivemem search "auth module" --json | jq '.results[0]'`}</code>
                </pre>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

    </div>
  )
}
