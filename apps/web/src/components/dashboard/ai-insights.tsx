"use client"
import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api"

export function AiInsights() {
  const [insight, setInsight] = useState<string | null>(null)

  useEffect(() => {
    apiFetch("/api/users/me/insights")
      .then((data: any) => setInsight(data?.insight || null))
      .catch(() => {})
  }, [])

  if (!insight) return null

  return (
    <div className="mx-4 mb-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-pink-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
          <Sparkles className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">✨ AI 洞察</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  )
}
