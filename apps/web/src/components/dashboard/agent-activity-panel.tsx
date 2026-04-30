"use client"

import { useState, useEffect, useCallback } from "react"
import { Bot, Search, Save, Brain, MessageCircle, ArrowLeftRight, Terminal } from "lucide-react"

// --- Agent Avatar: deterministic color from name hash ---
const AVATAR_PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
]

function agentColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function AgentAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const bg = agentColor(name)
  const initial = (name.charAt(0) || "?").toUpperCase()
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 font-semibold text-white select-none"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.45, lineHeight: 1 }}
      title={name}
    >
      {initial}
    </span>
  )
}
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/api"
import { trackEvent } from "@/lib/analytics"
import { relativeTime } from "@/lib/relative-time"

interface AgentActivity {
  id: string
  agentName: string
  action: string
  summary: string
  detail: string | null
  source: "agent" | "system"
  createdAt: string
}

type AggregatedActivity = AgentActivity & { count?: number }
type AgentFilter = string // "all" or agent name

/** Collapse consecutive same-agent same-action entries within 5min window */
function aggregateActivities(raw: AgentActivity[]): AggregatedActivity[] {
  if (!raw.length) return raw
  const result: AggregatedActivity[] = []
  let current: AggregatedActivity = { ...raw[0], count: 1 }

  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1]
    const curr = raw[i]
    const timeDiff = new Date(prev.createdAt).getTime() - new Date(curr.createdAt).getTime()

    if (curr.agentName === current.agentName && curr.action === current.action && timeDiff < 5 * 60 * 1000) {
      current.count = (current.count || 1) + 1
    } else {
      result.push(current)
      current = { ...curr, count: 1 }
    }
  }
  result.push(current)
  return result
}

/** Human-readable action description */
function humanizeAction(a: AgentActivity): string {
  const query = (a.summary || '').slice(0, 30)
  switch (a.action) {
    case 'search': case 'mcp_search': return `Searched: "${query}"`
    case 'ask': case 'mcp_ask': return `Asked: "${query}"`
    case 'compile': return 'Compiled context for agent'
    case 'store': case 'mcp_store': case 'auto_capture': case 'capture': return `Saved: "${query}"`
    default: return a.action?.replace(/_/g, ' ') || 'activity'
  }
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

// Tabs are now generated dynamically from activity data

function displayAgentName(name: string): string {
  // Strip generic "Agent" prefixes: Agent10, agent_a, agent-B-xyz, etc.
  const cleaned = name
    .replace(/^agent[-_]?\w?[-_]?/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
  if (!cleaned || /^\d+$/.test(cleaned)) return 'AI Agent';
  return cleaned;
}

/** Strip low-value prefixes from AI-generated summaries */
function cleanSummaryText(text: string): string {
  return text
    .replace(/^This (document|file|note|page|article|entry|memo|record|piece) (is about|describes|details|outlines|summarizes|covers|contains|provides|presents|discusses|explains|records|captures|announces|is a)[^.]*?\.\s*/i, '')
    .replace(/^(Here is|The following|Below is)[^.]*?\.\s*/i, '')
    .trim()
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
  })
}

function useClientNow(intervalMs = 60_000): Date | undefined {
  const [now, setNow] = useState<Date | undefined>(undefined)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function AgentActivityPanel() {
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [agentCount, setAgentCount] = useState(0)
  const [filter, setFilter] = useState<AgentFilter>("all")
  const [tracked, setTracked] = useState(false)
  const clientNow = useClientNow()

  const PAGE_SIZE = 10

  const fetchData = useCallback(async (loadMore = false) => {
    const currentOffset = loadMore ? offset + PAGE_SIZE : 0
    if (loadMore) setLoadingMore(true)
    try {
      const data = await apiFetch(`/api/agent-activity?limit=${PAGE_SIZE}&offset=${currentOffset}`, { silent: true }) as any
      const newItems = data?.activities || []
      if (loadMore) {
        setActivities(prev => [...prev, ...newItems])
      } else {
        setActivities(newItems)
      }
      setOffset(currentOffset)
      setTotal(data?.total || 0)
      if (data?.sourceCounts) {
        setAgentCount(data.sourceCounts.agent || 0)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [offset])

  useEffect(() => { fetchData(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30s (first page only)
  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 30_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Extract unique agent names for dynamic tabs
  const uniqueAgents = Array.from(
    new Map(
      activities.map(a => [a.agentName, displayAgentName(a.agentName)])
    )
  ).sort((a, b) => a[1].localeCompare(b[1]))

  // Aggregate consecutive same-agent same-action entries
  const aggregated = aggregateActivities(activities)

  // Filter out noisy/system entries users can't understand
  const filteredActivities = aggregated.filter(a => {
    // Apply agent name filter
    if (filter !== "all" && a.agentName !== filter) return false
    // Filter out idle session summaries
    if (/idle|Session idle/i.test(a.summary)) return false
    // Filter out raw session_summary style entries
    if (/^Session .* summary:/i.test(a.summary)) return false
    // Filter out garbled encoding (consecutive ?)
    if (/\?{3,}/.test(a.summary) || /\?{3,}/.test(a.detail || '')) return false
    return true
  }).map(a => ({
    ...a,
    // Humanize tool-call counts: "3 tool calls" → "Agent made 3 operations"
    summary: a.summary.replace(/^(\d+)\s+tool\s+calls?$/i, 'Agent made $1 operations')
      .replace(/(\d+)\s+tool\s+calls?/i, '$1 operations'),
  }))

  // Empty state — no activity at all
  if (filteredActivities.length === 0 && filter === "all") {
    return (
      <div className="rounded-2xl border shadow-soft p-6 mb-8">
        <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Agent Activity
        </h2>
        <div className="py-8 text-center">
          <span className="text-4xl block mx-auto mb-3">🤖</span>
          <p className="text-sm text-zinc-400 mb-1">No recent agent activity</p>
          <p className="text-sm text-zinc-400 mb-4">
            Connect an AI tool to see activity here
          </p>
          <Link
            href="/developers"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Terminal className="h-3.5 w-3.5" />
            Connect an agent →
          </Link>
        </div>
      </div>
    )
  }

  // Empty state for filtered view
  if (filteredActivities.length === 0 && filter !== "all") {
    return (
      <div className="rounded-2xl border shadow-soft p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider">
            Agent Activity
          </h2>
          <TabBar filter={filter} setFilter={setFilter} uniqueAgents={uniqueAgents} />
        </div>
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">No activity for this agent yet</p>
          <button
            onClick={() => setFilter("all")}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Show all activity
          </button>
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
        <div className="flex items-center gap-3">
          <TabBar filter={filter} setFilter={setFilter} uniqueAgents={uniqueAgents} />
          {total > 10 && (
            <span className="text-xs text-muted-foreground">{total} total</span>
          )}
        </div>
      </div>
      <TooltipProvider delayDuration={300}>
        <div className="space-y-0">
          {filteredActivities.map(a => {
            const config = ACTION_CONFIG[a.action] || { icon: Bot, color: "text-zinc-400", emoji: "🤖" }
            const Icon = config.icon
            const cleanedSummary = cleanSummaryText(a.summary)
            return (
              <div
                key={a.id}
                className="flex items-start gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <AgentAvatar name={displayAgentName(a.agentName)} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs flex-shrink-0 ${
                      displayAgentName(a.agentName) === 'AI Agent'
                        ? "text-zinc-400 dark:text-zinc-500 italic"
                        : "text-muted-foreground/60 font-medium"
                    }`}>
                      {displayAgentName(a.agentName)}
                    </span>
                    {a.source === "agent" && (
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                        MCP
                      </span>
                    )}
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {humanizeAction(a)}
                    </span>
                    {(a.count || 1) > 1 && (
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                        × {a.count}
                      </span>
                    )}
                  </div>
                  {cleanedSummary && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="mt-0.5 text-xs text-muted-foreground/50 line-clamp-1 cursor-default">
                          {cleanedSummary}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
                        {a.summary}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <span className="ml-auto text-xs text-muted-foreground/50 flex-shrink-0 whitespace-nowrap mt-0.5" title={formatTimestamp(a.createdAt)}>
                  {clientNow ? relativeTime(a.createdAt, clientNow) : ""}
                </span>
              </div>
            )
          })}
        </div>
      </TooltipProvider>
      {activities.length < total && (
        <button
          onClick={() => fetchData(true)}
          disabled={loadingMore}
          className="mt-3 w-full py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg transition disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : `Load more (${activities.length} of ${total})`}
        </button>
      )}
    </div>
  )
}

function TabBar({
  filter,
  setFilter,
  uniqueAgents,
}: {
  filter: AgentFilter
  setFilter: (f: AgentFilter) => void
  uniqueAgents: [string, string][] // [rawName, displayName]
}) {
  // Don't show tabs if only 1 agent
  if (uniqueAgents.length <= 1) return null

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    ...uniqueAgents.map(([raw, display]) => ({ key: raw, label: display })),
  ]

  return (
    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 overflow-x-auto max-w-[400px]">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => {
            setFilter(tab.key)
            trackEvent("agent_activity_filter", { agent: tab.key })
          }}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
            filter === tab.key
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
