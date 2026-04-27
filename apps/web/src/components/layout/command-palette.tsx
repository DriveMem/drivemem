"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useFiles } from "@/hooks/use-files"
import { apiFetch } from "@/lib/api"
import { Sparkles, Search, ThumbsUp, ThumbsDown } from "lucide-react"

interface SearchResult {
  type: "file" | "chunk"
  fileId: string
  fileName: string
  text?: string
  score?: number
}

function highlightText(text: string, query: string, maxLen = 120): React.ReactNode {
  if (!text || !query) return text?.slice(0, maxLen)
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, maxLen)
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + query.length + 40)
  const before = (start > 0 ? "..." : "") + text.slice(start, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length, end) + (end < text.length ? "..." : "")
  return <>{before}<mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{match}</mark>{after}</>
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { data: filesData } = useFiles()

  const sendSearchFeedback = useCallback((query: string, fileId: string, signal: 'click' | 'thumbs_up' | 'thumbs_down') => {
    apiFetch('/api/search/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, fileId, signal }) }).catch(() => {})
  }, [])
  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])

  const [inputValue, setInputValue] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [aiMode, setAiMode] = useState(false)

  // Detect ? prefix for AI mode
  const effectiveAiMode = aiMode || inputValue.startsWith("?")
  const effectiveQuery = effectiveAiMode && inputValue.startsWith("?") ? inputValue.slice(1).trim() : inputValue.trim()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!effectiveQuery || effectiveQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const endpoint = effectiveAiMode
          ? `/api/search?q=${encodeURIComponent(effectiveQuery)}&mode=semantic`
          : `/api/search?q=${encodeURIComponent(effectiveQuery)}`
        const data = await apiFetch(endpoint)
        const results = data?.results || (Array.isArray(data) ? data : [])
        setSearchResults(results.slice(0, 8))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, effectiveAiMode ? 500 : 300)
    return () => clearTimeout(timer)
  }, [effectiveQuery, effectiveAiMode])

  const navigate = (path: string) => {
    setOpen(false)
    setInputValue("")
    setSearchResults([])
    setAiMode(false)
    router.push(path)
  }

  const handleSearchSubmit = () => {
    if (effectiveQuery) {
      navigate(`/search?q=${encodeURIComponent(effectiveQuery)}${effectiveAiMode ? "&mode=semantic" : ""}`)
    }
  }

  const toggleAiMode = () => {
    setAiMode(prev => !prev)
    setSearchResults([])
  }

  const searchHeading = effectiveAiMode ? "AI Semantic search results" : "SearchResults"
  const emptyText = searching
    ? (effectiveAiMode ? "AI Search..." : "Search...")
    : "No results found"

  return (
    <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setInputValue(""); setSearchResults([]); setAiMode(false) } }}>
      <div className="flex items-center border-b px-1">
        <button
          onClick={toggleAiMode}
          className={`flex items-center gap-1 shrink-0 rounded-md px-2 py-1.5 mx-1 text-xs font-medium transition ${
            effectiveAiMode
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={effectiveAiMode ? "Switch to regular search" : "Switch to AI semantic search (or type ? prefix)"}
        >
          {effectiveAiMode ? <Sparkles className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
          {effectiveAiMode ? "AI" : "Regular"}
        </button>
        <CommandInput
          placeholder={effectiveAiMode ? "Enter a question for AI semantic search..." : "SearchFilesContent、Navigate, actions... (type ? to switch to AI Search)"}
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={(e) => {
            if (e.key === "Enter" && effectiveQuery) {
              e.preventDefault()
              handleSearchSubmit()
            }
          }}
          className="border-0"
        />
      </div>
      <CommandList>
        <CommandEmpty>{emptyText}</CommandEmpty>

        {searchResults.length > 0 && (
          <CommandGroup heading={searchHeading}>
            {searchResults.map((r, i) => (
              <CommandItem
                key={`search-${r.fileId}-${i}`}
                value={`search-${r.fileId}-${r.fileName}-${i}`}
                onSelect={() => { sendSearchFeedback(effectiveQuery, r.fileId, 'click'); navigate(`/files/${r.fileId}/preview`) }}
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm">{r.fileName}</span>
                  {r.text && (
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {effectiveAiMode ? r.text.slice(0, 150) : highlightText(r.text, effectiveQuery)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  {r.type === "chunk" && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                      effectiveAiMode ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {effectiveAiMode ? "Semantic match" : "ContentMatch"}
                    </span>
                  )}
                  {r.score !== undefined && effectiveAiMode && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {Math.round(r.score * 100)}%
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); sendSearchFeedback(effectiveQuery, r.fileId, 'thumbs_up') }}
                    className="rounded p-0.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition"
                    title="Helpful result"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); sendSearchFeedback(effectiveQuery, r.fileId, 'thumbs_down') }}
                    className="rounded p-0.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition"
                    title="Not helpful"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/chat?q=Questions about ${encodeURIComponent(r.fileName)}`) }}
                    className="rounded bg-brand-500 px-1.5 py-0.5 text-[10px] text-white hover:bg-brand-600 transition"
                  >
                    💬 Ask AI
                  </button>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!effectiveQuery && files.length > 0 && (
          <CommandGroup heading="RecentFiles">
            {files.slice(0, 5).map((f: any) => (
              <CommandItem
                key={f.id}
                value={`file-${f.id}-${f.name || f.originalName}`}
                onSelect={() => navigate(`/files/${f.id}/preview`)}
              >
                {f.name || f.originalName}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Navigation">
          <CommandItem value="nav-dashboard" onSelect={() => navigate("/dashboard")}>My files</CommandItem>
          <CommandItem value="nav-chat" onSelect={() => navigate("/chat")}>AI conversations</CommandItem>
          <CommandItem value="nav-search" onSelect={() => navigate("/search")}>Search</CommandItem>
          <CommandItem value="nav-timeline" onSelect={() => navigate("/timeline")}>Timeline</CommandItem>
          <CommandItem value="nav-developers" onSelect={() => navigate("/developers")}>Developer</CommandItem>
          <CommandItem value="nav-settings" onSelect={() => navigate("/settings")}>Settings</CommandItem>
        </CommandGroup>

        {!effectiveQuery && (
          <CommandGroup heading="Action">
            <CommandItem value="action-upload" onSelect={() => navigate("/dashboard")}>📄 Upload files</CommandItem>
            <CommandItem value="action-new-chat" onSelect={() => navigate("/chat?new=" + Date.now())}>💬 New conversation</CommandItem>
            <CommandItem value="action-search" onSelect={() => navigate("/search")}>🔍 SearchKnowledge library</CommandItem>
            <CommandItem value="action-settings-keys" onSelect={() => navigate("/settings?tab=developer")}>🔑 Manage API Keys</CommandItem>
            <CommandItem value="action-developers" onSelect={() => navigate("/developers")}>📖 DeveloperDocument</CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
