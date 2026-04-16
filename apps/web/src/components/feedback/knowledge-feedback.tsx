"use client"

import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

export function KnowledgeFeedback({ fileId }: { fileId: string }) {
  const [rating, setRating] = useState<string | null>(null)

  useEffect(() => {
    apiFetch(`/api/files/${fileId}/feedback`)
      .then((d: any) => setRating(d?.rating ?? null))
      .catch(() => {})
  }, [fileId])

  const rate = async (value: "useful" | "not_useful") => {
    const prev = rating
    const newRating = rating === value ? null : value
    setRating(newRating)
    try {
      if (newRating) {
        await apiFetch(`/api/files/${fileId}/feedback`, {
          method: "POST",
          body: JSON.stringify({ rating: newRating }),
        })
      }
    } catch {
      setRating(prev)
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); rate("useful") }}
        className={cn(
          "p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
          rating === "useful" && "text-green-600 bg-green-50 dark:bg-green-900/20"
        )}
        title="Useful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); rate("not_useful") }}
        className={cn(
          "p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
          rating === "not_useful" && "text-red-500 bg-red-50 dark:bg-red-900/20"
        )}
        title="Not useful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
