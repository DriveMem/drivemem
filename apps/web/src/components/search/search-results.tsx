"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { FileText, Search } from "lucide-react"

interface SearchResult {
  type: "file" | "chunk"
  fileId: string
  fileName: string
  text?: string
  chunkIndex?: number
  score?: number
}

function normalizeResults(data: unknown): SearchResult[] {
  if (!data) return []
  if (typeof data === "object" && data !== null && "results" in data && Array.isArray((data as any).results)) {
    return (data as any).results.map(normalizeItem)
  }
  if (Array.isArray(data)) {
    return data.map(normalizeItem)
  }
  return []
}

function normalizeItem(item: any): SearchResult {
  return {
    type: item.type || "file",
    fileId: item.fileId || item.id || "",
    fileName: item.fileName || item.name || item.originalName || "",
    text: item.text || item.snippet || item.highlight || item.excerpt || "",
    chunkIndex: item.chunkIndex,
    score: item.score,
  }
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-foreground rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    apiFetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((data) => {
        if (!cancelled) setResults(normalizeResults(data))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "搜索失败")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [query])

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Search className="h-8 w-8" />
        <p className="text-sm">用自然语言描述你想找的内容</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        搜索中…
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-destructive">
        搜索出错: {error}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Search className="h-8 w-8" />
        <p className="text-sm">未找到相关内容，试试换个描述方式</p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        找到 {results.length} 条结果
      </p>
      <ul className="space-y-3">
        {results.map((r, i) => (
          <li key={`${r.fileId}-${r.chunkIndex ?? i}`}>
            <Link
              href={`/files/${r.fileId}/preview`}
              className="block rounded-lg border p-4 transition hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium truncate">
                  <HighlightText text={r.fileName} query={query} />
                </p>
                {r.type === "chunk" && (
                  <span className="ml-auto shrink-0 rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                    内容匹配
                  </span>
                )}
                {r.score != null && (
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {Math.round(r.score * 100)}%
                  </span>
                )}
              </div>
              {r.text && r.text !== r.fileName && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  <HighlightText text={r.text} query={query} />
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
