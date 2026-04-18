"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckSquare, Circle, AlertTriangle, Target, Flag, Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface WorkItem {
  id: string
  type: string
  title: string
  status: string
  priority: string | null
  sourceAgent: string | null
  folderId: string | null
  createdAt: string
}

interface WorkItemCounts {
  decision: number
  todo: number
  blocker: number
  milestone: number
  insight: number
  active: number
  done: number
  blocked: number
}

const typeConfig: Record<string, { icon: typeof Circle; label: string; color: string }> = {
  decision: { icon: Target, label: "decisions", color: "text-amber-500" },
  todo: { icon: CheckSquare, label: "TODOs", color: "text-blue-500" },
  blocker: { icon: AlertTriangle, label: "blockers", color: "text-red-500" },
  milestone: { icon: Flag, label: "milestones", color: "text-green-500" },
  insight: { icon: Lightbulb, label: "insights", color: "text-purple-500" },
}

const statusEmoji: Record<string, string> = {
  active: "📌",
  done: "✅",
  blocked: "🔴",
  archived: "📦",
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return "now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function WorkItemsPanel() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [counts, setCounts] = useState<WorkItemCounts | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiFetch("/api/users/me/work-items")
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setCounts(data.counts || null)
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const toggleStatus = async (item: WorkItem) => {
    const newStatus = item.status === "done" ? "active" : "done"
    try {
      const res = await apiFetch(`/api/users/me/work-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
        fetchItems() // refresh counts
      }
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 animate-pulse">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32" />
      </div>
    )
  }

  if (!counts || (counts.active === 0 && counts.done === 0 && counts.blocked === 0)) {
    return null // Don't show if no work items
  }

  const activeItems = items.filter(i => i.status !== "archived")
  const summaryParts = Object.entries(typeConfig)
    .filter(([type]) => counts[type as keyof WorkItemCounts] > 0)
    .map(([type, cfg]) => {
      const Icon = cfg.icon
      const count = counts[type as keyof WorkItemCounts]
      return (
        <span key={type} className={`inline-flex items-center gap-1 ${cfg.color}`}>
          <Icon className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{count}</span>
          <span className="text-xs text-zinc-500">{cfg.label}</span>
        </span>
      )
    })

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">📋 Work Items</span>
          <div className="flex items-center gap-3">{summaryParts}</div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
          {activeItems.slice(0, 30).map(item => {
            const cfg = typeConfig[item.type] || typeConfig.todo
            const Icon = cfg.icon
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <button
                  onClick={() => toggleStatus(item)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    item.status === "done"
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-zinc-300 dark:border-zinc-600 hover:border-blue-400"
                  }`}
                >
                  {item.status === "done" && <span className="text-xs">✓</span>}
                </button>
                <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                <span className={`text-sm flex-1 ${item.status === "done" ? "line-through text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}`}>
                  {item.title}
                </span>
                {item.priority && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    item.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    item.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {item.priority}
                  </span>
                )}
                {item.status === "blocked" && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    blocked
                  </span>
                )}
                <span className="text-xs text-zinc-400 flex-shrink-0">{relativeTime(item.createdAt)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
