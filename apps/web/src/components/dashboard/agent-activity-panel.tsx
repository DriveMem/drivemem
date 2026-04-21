"use client"

import { useState, useEffect, useCallback } from "react"
import { Bot, Search, Save, Brain, MessageCircle, ArrowLeftRight, Terminal } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { trackEvent } from "@/lib/analytics"

interface AgentActivity {
  id: string
  agentName: string
  action: string
  summary: string
  detail: string | null
  createdAt: string
}

const ACTION_CONFIG: Record<string, { icon: typeof Bot; color: string; emoji: string }> = {
  store: { icon: Save, color: "text-emerald-500", emoji: "💾" },
  search: { icon: Search, color: "text-blue-500", emoji: "🔍" },
  ask: { icon: MessageCircle, color: "text-violet-500", emoji: "🧠" },
  compile: { icon: Brain, color: "text-amber-500", emoji: "🧠" },
  auto_capture: { icon: Save, color: "text-emerald-500", emoji: "💾" },
  capture: { icon: Save, color: "text-emerald-500", emoji: "💾" },
  relay: { icon: ArrowLeftRight, color: "text-indigo-500", emoji: "🔄" },
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function AgentActivityPanel() {
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [tracked, setTracked] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const data = await apiFetch("/api/agent-activity?limit=10", { silent: true }) as any
      setActivities(data?.activities || [])
      setTotal(data?.total || 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 30s to show new MCP activity
  useEffect(() => {
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!tracked && !loading) {
      trackEvent("agent_activity_viewed")
      setTracked(true)
    }
  }, [loading, tracked])

  if (loading) {
    return (
      <div className="rounded-2xl border shadow-soft p-6 mb-8">
        <div className="h-5 w-40 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border shadow-soft p-6 mb-8">
        <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Agent Activity
        </h2>
        <div className="py-8 text-center">
          <Bot className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No agent activity yet</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Connect an MCP agent to see how AI tools build your knowledge base
          </p>
          <Link
            href="/developers"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Terminal className="h-3.5 w-3.5" />
            Connect an agent
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border shadow-soft p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider">
          Agent Activity
        </h2>
        {total > 10 && (
          <span className="text-xs text-muted-foreground">{total} total</span>
        )}
      </div>
      <div className="space-y-0">
        {activities.map(a => {
          const config = ACTION_CONFIG[a.action] || { icon: Bot, color: "text-zinc-400", emoji: "🤖" }
          const Icon = config.icon
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0 font-medium">
                {a.agentName}
              </span>
              <span className="text-xs md:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {a.summary}
              </span>
              <span className="ml-auto text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                {relativeTime(a.createdAt)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
