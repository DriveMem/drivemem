"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"
import { SearchResults } from "@/components/search/search-results"

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  useEffect(() => { document.title = query ? `搜索: ${query} - AI Drive` : "搜索 - AI Drive" }, [query])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {query ? `搜索: "${query}"` : "搜索"}
      </h1>
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
