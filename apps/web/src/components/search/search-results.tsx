"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

interface SearchResult {
  fileId: string
  fileName: string
  snippet: string
  score?: number
}

function normalizeResults(data: unknown): SearchResult[] {
  if (!data) return []
  // { results: [...] }
  if (typeof data === "object" && data !== null && "results" in data && Array.isArray((data as any).results)) {
    return (data as any).results.map(normalizeItem)
  }
  // direct array
  if (Array.isArray(data)) {
    return data.map(normalizeItem)
  }
  return []
}

function normalizeItem(item: any): SearchResult {
  return {
    fileId: item.fileId || item.id || item.file_id || "",
    fileName: item.fileName || item.name || item.originalName || item.file_name || "",
    snippet: item.snippet || item.highlight || item.excerpt || item.fileName || item.name || "",
    score: item.score,
  }
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

    apiFetch(`/api/files/search?q=${encodeURIComponent(query)}`)
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
      <div className="py-8 text-center text-sm text-muted-foreground">
        输入关键词开始搜索
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        搜索中…
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        搜索出错: {error}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        未找到与 &quot;{query}&quot; 相关的结果
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {results.map((r) => (
        <li key={r.fileId}>
          <Link
            href={`/files/${r.fileId}/preview`}
            className="block px-4 py-3 hover:bg-accent"
          >
            <p className="font-medium">{r.fileName}</p>
            {r.snippet && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {r.snippet}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
