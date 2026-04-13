"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect, useState, useRef } from "react"
import { Search } from "lucide-react"
import { SearchResults } from "@/components/search/search-results"

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [input, setInput] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { document.title = query ? `搜索: ${query} - DriveMem` : "搜索 - DriveMem" }, [query])
  useEffect(() => { setInput(query) }, [query])
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }
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
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索你的文件和知识…"
            className="w-full rounded-xl border border-border bg-background pl-12 pr-4 py-4 text-lg outline-none transition focus:border-[#4F5BD5] focus:ring-2 focus:ring-[#4F5BD5]/20"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          AI 语义搜索 — 支持问题、关键词、自然语言描述
        </p>
      </form>

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
