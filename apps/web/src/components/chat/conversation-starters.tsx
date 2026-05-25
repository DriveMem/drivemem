"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { trackEvent } from "@/lib/analytics"

const DEFAULT_STARTERS = [
  "Summarize my most recent file",
  "What are the key takeaways from my documents?",
  "Search for action items across my files",
  "Compare the main topics in my knowledge base",
]

interface ConversationStartersProps {
  onSelect: (text: string) => void
}

export function ConversationStarters({ onSelect }: ConversationStartersProps) {
  const [starters, setStarters] = useState<string[]>(DEFAULT_STARTERS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to fetch dynamic starters, fallback to defaults
    apiFetch("/api/conversations/starters", { silent: true })
      .then((res: any) => {
        if (res?.starters?.length > 0) {
          setStarters(res.starters.slice(0, 4))
        }
      })
      .catch(() => {
        // Graceful degradation: keep defaults
      })
      .finally(() => setLoading(false))
  }, [])

  const handleClick = (starter: string) => {
    trackEvent("conversation_starter_click", { starter })
    onSelect(starter)
  }

  if (loading) {
    return (
      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-9 w-48 rounded-full bg-muted/50 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Try asking</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {starters.map((s) => (
          <button
            key={s}
            onClick={() => handleClick(s)}
            className="px-4 py-2 rounded-full border border-border hover:border-brand-500/50 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-sm text-foreground transition-all duration-200 hover:shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
