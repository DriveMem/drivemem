"use client"

import { useEffect, useRef, useState } from "react"
import { X, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLayoutStore } from "@/stores/layout-store"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

function splitIntoChunks(text: string, chunkSize = 800): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ""
  for (const p of paragraphs) {
    if (current.length + p.length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = p
    } else {
      current += (current ? "\n\n" : "") + p
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export function CitationPanel() {
  const { citationPanelOpen, citationFileId, citationChunkIndex, closeCitationPanel } = useLayoutStore()
  const [fileName, setFileName] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!citationPanelOpen || !citationFileId) return
    setLoading(true)
    setError(null)
    setContent("")
    setFileName("")

    apiFetch(`/api/files/${citationFileId}`)
      .then((file: any) => {
        setFileName(file.name || file.fileName || "Unknown file")
        // Try to get content from the file object or fetch separately
        if (file.content) {
          setContent(file.content)
          setLoading(false)
        } else if (file.extractedText) {
          setContent(file.extractedText)
          setLoading(false)
        } else {
          // Try fetching content endpoint
          return apiFetch(`/api/files/${citationFileId}/content`, { silent: true })
            .then((data: any) => {
              setContent(data?.content || data?.text || data?.extractedText || "Content not available")
              setLoading(false)
            })
            .catch(() => {
              setContent("Content not available for preview")
              setLoading(false)
            })
        }
      })
      .catch((err: any) => {
        setError("Failed to load file")
        setLoading(false)
      })
  }, [citationPanelOpen, citationFileId])

  useEffect(() => {
    if (!loading && content && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [loading, content])

  if (!citationPanelOpen) return null

  const chunks = splitIntoChunks(content)

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[400px] max-w-[90vw] bg-background border-l border-border shadow-xl animate-in slide-in-from-right duration-300 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate flex-1">{fileName || "Loading..."}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeCitationPanel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive text-center py-8">{error}</div>
        )}
        {!loading && !error && chunks.length > 0 && (
          <div className="space-y-3">
            {chunks.map((chunk, i) => (
              <div
                key={i}
                ref={i === citationChunkIndex ? highlightRef : undefined}
                className={cn(
                  "text-sm whitespace-pre-wrap rounded-md p-3 transition-colors",
                  i === citationChunkIndex
                    ? "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-400"
                    : "text-muted-foreground"
                )}
              >
                {chunk}
              </div>
            ))}
          </div>
        )}
        {!loading && !error && chunks.length === 0 && content === "" && (
          <p className="text-sm text-muted-foreground text-center py-8">No content available</p>
        )}
      </div>
    </div>
  )
}
