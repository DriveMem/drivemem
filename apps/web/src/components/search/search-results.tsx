"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { FileText, Search } from "lucide-react"
import { KnowledgeFeedback } from "@/components/feedback/knowledge-feedback"

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const offsetRef = useRef(0)
  const LIMIT = 20

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setHasMore(false)
      setTotal(0)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    offsetRef.current = 0

    apiFetch(`/api/search?q=${encodeURIComponent(query)}&limit=${LIMIT}&offset=0`)
      .then((data: any) => {
        if (!cancelled) {
          setResults(normalizeResults(data))
          setHasMore(!!data?.hasMore)
          setTotal(data?.total ?? 0)
          offsetRef.current = LIMIT
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "SearchFailed")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [query])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const data: any = await apiFetch(`/api/search?q=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${offsetRef.current}`)
      const newResults = normalizeResults(data)
      setResults(prev => [...prev, ...newResults])
      setHasMore(!!data?.hasMore)
      offsetRef.current += LIMIT
    } catch (err: any) {
      // silently fail on load more
    } finally {
      setLoadingMore(false)
    }
  }

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Search className="h-8 w-8" />
        <p className="text-sm">Describe what you're looking for in natural language</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Search...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-destructive">
        SearchError: {error}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
        <Search className="h-8 w-8" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">No results found for "{query}"</p>
          <p className="text-xs">Try: </p>
          <ul className="text-xs space-y-1">
            <li>• Try rephrasing or using different keywords</li>
            <li>• Try a shorter query (e.g., search for core concepts only)</li>
            <li>• <a href="/dashboard" className="text-brand-500 hover:underline">Upload more files</a> Enrich your knowledge library</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Found {results.length} results
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
                    ContentMatch
                  </span>
                )}
                {r.score != null && (
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {Math.round(r.score * 100)}%
                  </span>
                )}
                <KnowledgeFeedback fileId={r.fileId} />
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
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border px-6 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  )
}
