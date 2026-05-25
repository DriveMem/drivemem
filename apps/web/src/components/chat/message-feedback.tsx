"use client"

import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"

interface MessageFeedbackProps {
  messageId: string
}

export function MessageFeedback({ messageId }: MessageFeedbackProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`dm-feedback-${messageId}`)
    if (stored === "up" || stored === "down") setRating(stored)
  }, [messageId])

  const handleFeedback = (value: "up" | "down") => {
    const newRating = rating === value ? null : value
    setRating(newRating)

    if (newRating) {
      localStorage.setItem(`dm-feedback-${messageId}`, newRating)
      trackEvent("chat.feedback", { messageId, rating: newRating })
    } else {
      localStorage.removeItem(`dm-feedback-${messageId}`)
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => handleFeedback("up")}
        className={cn(
          "p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent",
          rating === "up" && "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
        )}
        aria-label="Helpful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handleFeedback("down")}
        className={cn(
          "p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent",
          rating === "down" && "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
        )}
        aria-label="Not helpful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
