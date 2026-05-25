"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect, useState, useRef, useCallback } from "react"
import { Search, X } from "lucide-react"
import { SearchResults } from "@/components/search/search-results"

const HISTORY_KEY = "dm-recent-searches"
const MAX_HISTORY = 5

function getHistory(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function addToHistory(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return
  const history = getHistory().filter(h => h !== trimmed)
  history.unshift(trimmed)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function removeFromHistory(query: string) {
  const history = getHistory().filter(h => h !== query)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [input, setInput] = useState(query)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { document.title = query ? `Search: ${query} — DriveMem` : "Search — DriveMem" }, [query])
  useEffect(() => { setInput(query) }, [query])
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setHistory(getHistory()) }, [])

  // Save to history when query changes (from URL)
  useEffect(() => {
    if (query.trim()) {
      addToHistory(query)
      setHistory(getHistory())
    }
  }, [query])

  const doSearch = useCallback((value: string) => {
    const trimmed = value.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    // Debounced auto-search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.trim() && value.trim() !== query) {
        doSearch(value)
      }
    }, 300)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    doSearch(input)
  }

  const handleHistoryClick = (item: string) => {
    setInput(item)
    setShowHistory(false)
    doSearch(item)
  }

  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation()
    removeFromHistory(item)
    setHistory(getHistory())
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearHistory()
    setHistory([])
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Search input */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder="Search your files and knowledge..."
            className="w-full rounded-xl border border-border bg-background pl-12 pr-4 py-4 text-lg outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          AI Semantic search — supports questions, keywords, natural language
        </p>

        {/* Recent search history */}
        {showHistory && history.length > 0 && !input.trim() && (
          <div className="mt-2 rounded-lg border border-border bg-background p-2 shadow-sm">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-xs text-muted-foreground font-medium">Recent searches</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleClearAll(e) }}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                Clear all
              </button>
            </div>
            {history.map((item) => (
              <button
                key={item}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleHistoryClick(item) }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent transition group"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 text-left">{item}</span>
                <span
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveHistory(e, item) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Results */}
      <SearchResults query={query} inputRef={inputRef} />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading…</div>}>
      <SearchContent />
    </Suspense>
  )
}
