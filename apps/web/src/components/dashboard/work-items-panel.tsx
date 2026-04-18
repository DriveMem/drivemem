"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { CheckSquare, Circle, AlertTriangle, Target, Flag, Lightbulb, ChevronDown, ChevronUp, X, Plus } from "lucide-react"
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

const typeConfig: Record<string, { icon: typeof Circle; label: string; color: string; emoji: string }> = {
  decision: { icon: Target, label: "decisions", color: "text-amber-500", emoji: "📋" },
  todo: { icon: CheckSquare, label: "TODOs", color: "text-blue-500", emoji: "✅" },
  blocker: { icon: AlertTriangle, label: "blockers", color: "text-red-500", emoji: "🔴" },
  milestone: { icon: Flag, label: "milestones", color: "text-green-500", emoji: "🎯" },
  insight: { icon: Lightbulb, label: "insights", color: "text-purple-500", emoji: "💡" },
}

const typeOptions = [
  { value: "todo", label: "✅ Todo" },
  { value: "decision", label: "📋 Decision" },
  { value: "blocker", label: "🔴 Blocker" },
  { value: "milestone", label: "🎯 Milestone" },
  { value: "insight", label: "💡 Insight" },
]

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return "now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

interface WorkItemsPanelProps {
  /** Filter work items by folder/project ID */
  folderId?: string | null
  /** Start expanded (default false) */
  defaultExpanded?: boolean
}

export function WorkItemsPanel({ folderId, defaultExpanded = false }: WorkItemsPanelProps) {
  const [items, setItems] = useState<WorkItem[]>([])
  const [counts, setCounts] = useState<WorkItemCounts | null>(null)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState("todo")
  const [creating, setCreating] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (folderId) params.set("folderId", folderId)
      const qs = params.toString()
      const res = await apiFetch(`/api/users/me/work-items${qs ? `?${qs}` : ""}`)
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
  }, [folderId])

  useEffect(() => {
    setLoading(true)
    fetchItems()
  }, [fetchItems])

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
        fetchItems()
      }
    } catch { /* silent */ }
  }

  const deleteItem = async (item: WorkItem) => {
    try {
      const res = await apiFetch(`/api/users/me/work-items/${item.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id))
        fetchItems()
      }
    } catch { /* silent */ }
  }

  const createItem = async () => {
    if (!newTitle.trim() || creating) return
    setCreating(true)
    try {
      const res = await apiFetch("/api/users/me/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          title: newTitle.trim(),
          status: "active",
          ...(folderId ? { folderId } : {}),
        }),
      })
      if (res.ok) {
        setNewTitle("")
        setNewType("todo")
        setShowCreate(false)
        fetchItems()
      }
    } catch { /* silent */ }
    finally { setCreating(false) }
  }

  useEffect(() => {
    if (showCreate && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [showCreate])

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 animate-pulse">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32" />
      </div>
    )
  }

  if (!counts || (counts.active === 0 && counts.done === 0 && counts.blocked === 0)) {
    // Show minimal create UI when in project context
    if (folderId) {
      return (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">📋 Work Items</span>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {showCreate && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-1"
              >
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                ref={titleInputRef}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createItem()}
                placeholder="Title..."
                className="flex-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1"
              />
              <button onClick={createItem} disabled={creating || !newTitle.trim()} className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                Save
              </button>
              <button onClick={() => { setShowCreate(false); setNewTitle("") }} className="text-xs text-zinc-400 hover:text-zinc-600">
                Cancel
              </button>
            </div>
          )}
          {!showCreate && (
            <p className="text-xs text-zinc-400 mt-1">No work items yet</p>
          )}
        </div>
      )
    }
    return null
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
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {/* Inline create form */}
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
            {showCreate ? (
              <div className="flex items-center gap-2">
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-1"
                >
                  {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input
                  ref={titleInputRef}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createItem(); if (e.key === "Escape") { setShowCreate(false); setNewTitle("") } }}
                  placeholder="Title..."
                  className="flex-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1"
                />
                <button onClick={createItem} disabled={creating || !newTitle.trim()} className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                  Save
                </button>
                <button onClick={() => { setShowCreate(false); setNewTitle("") }} className="text-xs text-zinc-400 hover:text-zinc-600">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add work item
              </button>
            )}
          </div>

          {/* Items list */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
            {activeItems.slice(0, 50).map(item => {
              const cfg = typeConfig[item.type] || typeConfig.todo
              const Icon = cfg.icon
              const isDone = item.status === "done"
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group ${isDone ? "opacity-60" : ""}`}
                >
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isDone
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-zinc-300 dark:border-zinc-600 hover:border-blue-400"
                    }`}
                  >
                    {isDone && <span className="text-xs">✓</span>}
                  </button>
                  <span className="flex-shrink-0 text-sm" title={item.type}>{cfg.emoji}</span>
                  <span className={`text-sm flex-1 min-w-0 truncate ${isDone ? "line-through text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}`}>
                    {item.title}
                  </span>
                  {item.priority && (
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      item.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      item.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}>
                      {item.priority}
                    </span>
                  )}
                  {item.status === "blocked" && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
                      blocked
                    </span>
                  )}
                  {item.sourceAgent && (
                    <span className="text-xs text-zinc-400 flex-shrink-0 hidden sm:inline" title={`Source: ${item.sourceAgent}`}>
                      🤖 {item.sourceAgent.split("-").pop()}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 flex-shrink-0">{relativeTime(item.createdAt)}</span>
                  <button
                    onClick={() => deleteItem(item)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
