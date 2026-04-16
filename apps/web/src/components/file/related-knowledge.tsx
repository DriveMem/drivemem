"use client"

import { useState, useEffect } from "react"
import { Loader2, Link as LinkIcon } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Relationship {
  id: string
  relatedFileId: string
  relatedFileName: string
  type: string
  confidence?: number
}

export function RelatedKnowledge({ fileId, onFileClick }: { fileId: string; onFileClick?: (id: string) => void }) {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/files/${fileId}/relationships`)
      .then((data: any) => setRelationships(data?.relationships || []))
      .catch(() => setRelationships([]))
      .finally(() => setLoading(false))
  }, [fileId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading relationships…
      </div>
    )
  }

  if (relationships.length === 0) return null

  const typeColors: Record<string, string> = {
    relation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    contradiction: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    trend: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <LinkIcon className="h-3 w-3" /> Related Knowledge
      </p>
      <div className="space-y-1">
        {relationships.map((rel) => (
          <button
            key={rel.id}
            onClick={() => onFileClick?.(rel.relatedFileId)}
            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="truncate flex-1">{rel.relatedFileName}</span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[rel.type] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
              {rel.type}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
