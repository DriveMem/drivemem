"use client"

import { useState, useEffect } from "react"
import { FileText } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface FileItem {
  id: string
  name: string
  path?: string
}

interface FileMentionProps {
  query: string
  onSelect: (file: FileItem) => void
  onClose: () => void
  visible: boolean
}

export function FileMention({ query, onSelect, onClose, visible }: FileMentionProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const q = query.trim()
    apiFetch(`/api/files${q ? `?q=${encodeURIComponent(q)}&limit=8` : '?limit=8'}`)
      .then((res: any) => {
        const items = Array.isArray(res) ? res : res?.files || res?.items || []
        setFiles(items.map((f: any) => ({ id: f.id || f.fileId, name: f.name || f.originalName || f.fileName, path: f.path })))
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [query, visible])

  useEffect(() => { setActiveIndex(0) }, [files])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => (i + 1) % Math.max(files.length, 1)) }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => (i - 1 + files.length) % Math.max(files.length, 1)) }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (files[activeIndex]) onSelect(files[activeIndex]) }
      else if (e.key === "Escape") { e.preventDefault(); onClose() }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [visible, activeIndex, files, onSelect, onClose])

  if (!visible) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 max-w-[320px] rounded-xl border bg-background shadow-lg overflow-hidden z-50">
      {loading ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">Searching...</div>
      ) : files.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">No files found</div>
      ) : (
        files.map((f, i) => (
          <button
            key={f.id}
            onClick={() => onSelect(f)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
              i === activeIndex ? "bg-accent" : "hover:bg-accent/50"
            )}
          >
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm truncate">{f.name}</p>
              {f.path && <p className="text-[10px] text-muted-foreground truncate">{f.path}</p>}
            </div>
          </button>
        ))
      )}
    </div>
  )
}
