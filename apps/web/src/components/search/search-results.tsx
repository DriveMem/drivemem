"use client"

import Link from "next/link"
import { mockFiles } from "@/lib/mock-data"
import { COPY } from "@/lib/copy"

interface SearchResult {
  fileId: string
  fileName: string
  snippet: string
  matchStart: number
  matchEnd: number
}

function highlightSnippet(snippet: string, start: number, end: number) {
  const before = snippet.slice(0, start)
  const match = snippet.slice(start, end)
  const after = snippet.slice(end)
  return (
    <span>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800">{match}</mark>
      {after}
    </span>
  )
}

// Mock search function
function mockSearch(query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return mockFiles
    .filter((f) => f.name.toLowerCase().includes(q))
    .map((f) => {
      const idx = f.name.toLowerCase().indexOf(q)
      return {
        fileId: f.id,
        fileName: f.name,
        snippet: f.name,
        matchStart: idx,
        matchEnd: idx + query.length,
      }
    })
}

export function SearchResults({ query }: { query: string }) {
  const results = mockSearch(query)

  if (!query.trim()) return null

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
            <p className="text-sm text-muted-foreground">
              {highlightSnippet(r.snippet, r.matchStart, r.matchEnd)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
