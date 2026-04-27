"use client"

import { useState, useEffect } from "react"
import { Search, X, Upload } from "lucide-react"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

interface KnowledgeGap {
  id: number
  query: string
  source: string
  resultCount: number
  createdAt: string
}

const sourceBadge: Record<string, { label: string; color: string }> = {
  search: { label: "Search", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  mcp_search: { label: "Agent", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  ask: { label: "Ask", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  chat: { label: "Chat", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function KnowledgeGapsPanel() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/knowledge-gaps", { silent: true })
      .then((data: any) => setGaps(data?.gaps || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dismiss = async (id: number) => {
    setGaps(prev => prev.filter(g => g.id !== id))
    await apiFetch(`/api/knowledge-gaps/${id}/dismiss`, { method: "POST", silent: true }).catch(() => {})
  }

  if (loading || gaps.length === 0) return null

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <Search className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Knowledge Gaps</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Topics your AI tools searched for but couldn't find
      </p>
      <div className="space-y-2">
        {gaps.map(gap => {
          const badge = sourceBadge[gap.source] || sourceBadge.search
          return (
            <div key={gap.id} className="flex items-center gap-2 group">
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{gap.query}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${badge.color}`}>
                {badge.label}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(gap.createdAt)}</span>
              <button
                onClick={() => dismiss(gap.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )
        })}
      </div>
      <Link
        href="/files"
        className="flex items-center gap-1 text-xs text-primary hover:underline mt-3"
      >
        <Upload className="h-3 w-3" />
        Upload files to fill these gaps →
      </Link>
    </div>
  )
}
