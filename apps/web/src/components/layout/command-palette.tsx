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

interface SearchResult {
  type: "file" | "chunk"
  fileId: string
  fileName: string
  text?: string
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
  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])

  const [inputValue, setInputValue] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

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

  // Debounced server search
  useEffect(() => {
    if (!inputValue.trim() || inputValue.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await apiFetch(`/api/search?q=${encodeURIComponent(inputValue.trim())}`)
        const results = data?.results || (Array.isArray(data) ? data : [])
        setSearchResults(results.slice(0, 8))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  const navigate = (path: string) => {
    setOpen(false)
    setInputValue("")
    setSearchResults([])
    router.push(path)
  }

  const handleSearchSubmit = () => {
    if (inputValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setInputValue(""); setSearchResults([]) } }}>
      <CommandInput
        placeholder="搜索文件内容、导航、操作…"
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={(e) => {
          if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault()
            handleSearchSubmit()
          }
        }}
      />
      <CommandList>
        <CommandEmpty>{searching ? "搜索中..." : "未找到结果"}</CommandEmpty>

        {searchResults.length > 0 && (
          <CommandGroup heading="搜索结果">
            {searchResults.map((r, i) => (
              <CommandItem
                key={`search-${r.fileId}-${i}`}
                value={`search-${r.fileId}-${r.fileName}-${i}`}
                onSelect={() => navigate(`/files/${r.fileId}/preview`)}
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm">{r.fileName}</span>
                  {r.type === "chunk" && r.text && (
                    <span className="text-xs text-muted-foreground line-clamp-2">{highlightText(r.text, inputValue.trim())}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  {r.type === "chunk" && (
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">内容匹配</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/chat?q=关于${encodeURIComponent(r.fileName)}的问题`) }}
                    className="rounded bg-[#4F5BD5] px-1.5 py-0.5 text-[10px] text-white hover:bg-[#3D49C4] transition"
                  >
                    💬 问 AI
                  </button>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!inputValue.trim() && files.length > 0 && (
          <CommandGroup heading="最近文件">
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

        <CommandGroup heading="导航">
          <CommandItem value="nav-dashboard" onSelect={() => navigate("/dashboard")}>我的文件</CommandItem>
          <CommandItem value="nav-chat" onSelect={() => navigate("/chat")}>AI 对话</CommandItem>
          <CommandItem value="nav-settings" onSelect={() => navigate("/settings")}>设置</CommandItem>
        </CommandGroup>

        {!inputValue.trim() && (
          <CommandGroup heading="操作">
            <CommandItem value="action-upload" onSelect={() => navigate("/dashboard")}>让 AI 记住文件</CommandItem>
            <CommandItem value="action-new-chat" onSelect={() => navigate("/chat")}>新对话</CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
