"use client"

import { useState } from "react"
import { FileText } from "lucide-react"

interface Source {
  fileId?: string
  fileName?: string
  chunkIndex?: number
}

interface ContextChipsProps {
  sources: Source[]
}

export function ContextChips({ sources }: ContextChipsProps) {
  const [expanded, setExpanded] = useState(false)

  // Deduplicate by fileId
  const uniqueSources = sources.reduce<Source[]>((acc, s) => {
    if (s.fileId && !acc.find(a => a.fileId === s.fileId)) acc.push(s)
    return acc
  }, [])

  if (uniqueSources.length === 0) return null

  const visible = expanded ? uniqueSources : uniqueSources.slice(0, 3)
  const remaining = uniqueSources.length - 3

  return (
    <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-none not-prose">
      <span className="text-xs text-muted-foreground flex-shrink-0">📎</span>
      {visible.map((s) => (
        <span
          key={s.fileId}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 max-w-[200px] truncate cursor-default"
          title={s.fileName}
        >
          <FileText className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{(s.fileName || "Unknown").slice(0, 24)}</span>
        </span>
      ))}
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          +{remaining} more
        </button>
      )}
    </div>
  )
}
