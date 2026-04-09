"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect, useState, useRef, useCallback } from "react"
import { Search } from "lucide-react"
import { SearchResults } from "@/components/search/search-results"

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""
  const [input, setInput] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { document.title = query ? `搜索: ${query} - AI Drive` : "搜索 - AI Drive" }, [query])
  useEffect(() => { inputRef.current?.focus() }, [])

  // Sync URL → state when navigating back/forward
  useEffect(() => {
    const urlQuery = searchParams.get("q") || ""
    setInput(urlQuery)
    setQuery(urlQuery)
  }, [searchParams])

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim()
      setQuery(trimmed)
      if (trimmed) {
        router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false })
      } else {
        router.replace("/search", { scroll: false })
      }
    }, 300)
  }, [router])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Search input */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="搜索你的文件和知识…"
            className="w-full rounded-xl border border-border bg-background pl-12 pr-4 py-4 text-lg outline-none transition focus:border-[#4F5BD5] focus:ring-2 focus:ring-[#4F5BD5]/20"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          AI 语义搜索 — 支持问题、关键词、自然语言描述
        </p>
      </div>

      {/* Results */}
      <SearchResults query={query} />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-muted-foreground">加载中…</div>}>
      <SearchContent />
    </Suspense>
  )
}
