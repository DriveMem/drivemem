"use client"
import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api"

const MAX_CHARS = 80

export function AiInsights() {
  const [insight, setInsight] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    apiFetch("/api/users/me/insights", { silent: true })
      .then((data: any) => setInsight(data?.insight || null))
      .catch(() => {})
  }, [])

  if (!insight) return null

  const isLong = insight.length > MAX_CHARS
  const displayText = expanded || !isLong ? insight : insight.slice(0, MAX_CHARS) + "..."

  return (
    <div className="mx-4 mb-4 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-indigo-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">✨ AI Insights</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displayText}
            {isLong && (
              <button onClick={() => setExpanded(!expanded)} className="ml-1 text-indigo-400 hover:underline text-xs">
                {expanded ? "Collapse" : "Expand"}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
