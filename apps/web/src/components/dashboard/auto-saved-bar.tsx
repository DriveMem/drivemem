"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, X } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface AutoSavedItem {
  id: string
  name: string
  summary?: string
  createdAt: string
}

export function AutoSavedBar() {
  const [item, setItem] = useState<AutoSavedItem | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const checkRecent = useCallback(async () => {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const data = await apiFetch(`/api/v1/recent-auto-saved?since=${fiveMinAgo}&limit=1`, { silent: true }) as any
      const files: AutoSavedItem[] = data?.files || []
      const latest = files[0]
      if (latest && !dismissedIds.has(latest.id)) {
        setItem(latest)
        setVisible(true)
      }
    } catch {
      // silent
    }
  }, [dismissedIds])

  useEffect(() => {
    checkRecent()
    const interval = setInterval(checkRecent, 30_000)
    return () => clearInterval(interval)
  }, [checkRecent])

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(timer)
  }, [visible, item?.id])

  const dismiss = () => {
    setVisible(false)
    if (item) setDismissedIds(prev => new Set(prev).add(item.id))
  }

  if (!visible || !item) return null

  // Extract readable title from filename like "auto-capture-2026-04-17T15-00-00-analysis.md"
  const title = item.summary
    ? item.summary.slice(0, 60) + (item.summary.length > 60 ? "…" : "")
    : item.name.replace(/^auto-capture-[\dT-]+/, "").replace(/\.md$/, "").replace(/^-/, "") || "a new note"

  return (
    <div className="animate-in slide-in-from-top-2 fade-in duration-300 mb-4 mx-4 md:mx-0">
      <div className="flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-2.5 text-sm">
        <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0 animate-pulse" />
        <span className="text-violet-700 dark:text-violet-300 truncate">
          ✨ AI just remembered: <span className="font-medium">{title}</span>
        </span>
        <button
          onClick={dismiss}
          className="ml-auto text-violet-400 hover:text-violet-600 dark:hover:text-violet-200 flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
