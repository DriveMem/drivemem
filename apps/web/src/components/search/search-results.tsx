"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { FileText, Search, ExternalLink, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
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

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="ml-auto h-4 w-16 rounded bg-muted" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>
    </div>
  )
}

interface SearchResultsProps {
  query: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function SearchResults({ query, inputRef }: SearchResultsProps) {
  const router = useRouter()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [duration, setDuration] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const offsetRef = useRef(0)
  const LIMIT = 20

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setHasMore(false)
      setTotal(0)
      setDuration(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setActiveIndex(-1)
    offsetRef.current = 0
    const startTime = performance.now()

    apiFetch(`/api/search?q=${encodeURIComponent(query)}&limit=${LIMIT}&offset=0`)
      .then((data: any) => {
        if (!cancelled) {
          setResults(normalizeResults(data))
          setHasMore(!!data?.hasMore)
          setTotal(data?.total ?? 0)
          setDuration(performance.now() - startTime)
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

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (results.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex(prev => prev >= results.length - 1 ? 0 : prev + 1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(prev => prev <= 0 ? results.length - 1 : prev - 1)
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault()
      const result = results[activeIndex]
      if (result) router.push(`/files/${result.fileId}/preview`)
    } else if (e.key === "Escape") {
      setActiveIndex(-1)
    }
  }, [results, activeIndex, router])

  useEffect(() => {
    const el = inputRef?.current
    if (!el) return
    el.addEventListener("keydown", handleKeyDown as any)
    return () => el.removeEventListener("keydown", handleKeyDown as any)
  }, [inputRef, handleKeyDown])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const data: any = await apiFetch(`/api/search?q=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${offsetRef.current}`)
      const newResults = normalizeResults(data)
      setResults(prev => [...prev, ...newResults])
      setHasMore(!!data?.hasMore)
      offsetRef.current += LIMIT
    } catch {
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
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-muted animate-pulse mb-4" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
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
        <div className="text-4xl">🔍</div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-foreground">没有找到相关内容</p>
          <p className="text-sm">关于 &ldquo;{query}&rdquo; 没有匹配的结果，试试：</p>
          <ul className="text-sm space-y-1.5 mt-3">
            <li>• 换个关键词或用更简短的搜索词</li>
            <li>• <a href="/files" className="text-brand-500 hover:underline font-medium">上传包含相关内容的文件</a></li>
            <li>• 在 <a href="/chat?new=1" className="text-brand-500 hover:underline font-medium">Chat</a> 中用自然语言提问</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Found {results.length} results{duration != null && ` in ${(duration / 1000).toFixed(1)}s`}
      </p>
      <ul className="space-y-3">
        {results.map((r, i) => (
          <li key={`${r.fileId}-${r.chunkIndex ?? i}`}>
            <Link
              href={`/files/${r.fileId}/preview`}
              className={cn(
                "group block rounded-lg border p-4 transition hover:bg-accent relative",
                activeIndex === i && "ring-2 ring-brand-500"
              )}
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
                  <HighlightText text={r.text.slice(0, 150)} query={query} />
                </p>
              )}
              {/* Quick actions - visible on hover */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  Preview
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/chat?new=1&fileId=${r.fileId}`) }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  <MessageCircle className="h-3 w-3" />
                  Chat about this
                </button>
              </div>
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
