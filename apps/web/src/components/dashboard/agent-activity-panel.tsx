"use client"

import { useState, useEffect, useCallback } from "react"
import { Bot, Search, Save, Brain, MessageCircle, ArrowLeftRight, Terminal } from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/api"
import { trackEvent } from "@/lib/analytics"

interface AgentActivity {
  id: string
  agentName: string
  action: string
  summary: string
  detail: string | null
  source: "agent" | "system"
  createdAt: string
}

type AgentFilter = string // "all" or agent name

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

function relativeTime(dateStr: string, now?: Date): string {
  const ref = now ? now.getTime() : Date.now()
  const diff = ref - new Date(dateStr).getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
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

  // Filter out noisy/system entries users can't understand
  const filteredActivities = activities.filter(a => {
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
          <Bot className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Your agents haven&apos;t done anything yet</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Connect an agent to see their activity here.
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
                <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${config.color}`} />
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
                      {a.action?.replace(/_/g, ' ') || 'activity'}
                    </span>
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
                <span className="ml-auto text-xs text-muted-foreground/50 flex-shrink-0 whitespace-nowrap mt-0.5">
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
