"use client"
import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api"

const MAX_CHARS = 80

export function AiInsights() {
  const [insight, setInsight] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    apiFetch("/api/users/me/insights")
      .then((data: any) => setInsight(data?.insight || null))
      .catch(() => {})
  }, [])

  if (!insight) return null

  const isLong = insight.length > MAX_CHARS
  const displayText = expanded || !isLong ? insight : insight.slice(0, MAX_CHARS) + "..."

  return (
    <div className="mx-4 mb-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-pink-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
          <Sparkles className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">✨ AI 洞察</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displayText}
            {isLong && (
              <button onClick={() => setExpanded(!expanded)} className="ml-1 text-blue-400 hover:underline text-xs">
                {expanded ? "收起" : "展开"}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
