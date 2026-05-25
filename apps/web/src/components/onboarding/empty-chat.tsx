"use client"

import { MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { trackEvent } from "@/lib/analytics"

const suggestions = [
  "Summarize my latest file",
  "What are the key takeaways?",
  "Search for information about...",
]

export function EmptyChat() {
  const router = useRouter()

  const handleSuggestion = (topic: string) => {
    trackEvent("onboarding.empty_state_click", { action: "chat_suggestion", topic })
    router.push(`/chat?new=1&q=${encodeURIComponent(topic)}`)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <MessageCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Ask your AI anything</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Your uploaded knowledge is available in every conversation
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
        {suggestions.map((topic) => (
          <button
            key={topic}
            onClick={() => handleSuggestion(topic)}
            className="px-3 py-1.5 text-xs rounded-full border border-border hover:border-brand-500/50 hover:text-brand-500 transition-colors"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  )
}
