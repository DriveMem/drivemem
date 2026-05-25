"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, FileText, LayoutDashboard, MessageSquare, FolderOpen, Inbox, Settings, Upload, X } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { trackEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"

interface PaletteItem {
  id: string
  name: string
  description?: string
  path: string
  type: "file" | "action"
  icon?: React.ReactNode
}

const ACTIONS: PaletteItem[] = [
  { id: "act-dashboard", name: "Dashboard", path: "/dashboard", type: "action", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "act-chat", name: "Chat", path: "/chat", type: "action", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "act-files", name: "Files", path: "/files", type: "action", icon: <FolderOpen className="h-4 w-4" /> },
  { id: "act-inbox", name: "Inbox", path: "/inbox", type: "action", icon: <Inbox className="h-4 w-4" /> },
  { id: "act-search", name: "Search", path: "/search", type: "action", icon: <Search className="h-4 w-4" /> },
  { id: "act-settings", name: "Settings", path: "/settings", type: "action", icon: <Settings className="h-4 w-4" /> },
  { id: "act-upload", name: "Upload", path: "/files", type: "action", icon: <Upload className="h-4 w-4" /> },
]

const RECENT_KEY = "dm-recent-palette"

function getRecent(): PaletteItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw).slice(0, 5) : []
  } catch { return [] }
}

function addRecent(item: PaletteItem) {
  try {
    const items = getRecent().filter(i => i.id !== item.id)
    items.unshift(item)
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 5)))
  } catch {}
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [files, setFiles] = useState<PaletteItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Global keydown
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => {
          if (!prev) trackEvent("palette_open")
          return !prev
        })
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Search files with debounce
  useEffect(() => {
    if (!query.trim()) { setFiles([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/files?q=${encodeURIComponent(query)}`)
        const data = Array.isArray(res) ? res : res?.files || res?.data || []
        setFiles(data.slice(0, 8).map((f: any) => ({
          id: f.id || f.name,
          name: f.name || f.title,
          description: f.path || f.description,
          path: `/files/${f.id}`,
          type: "file" as const,
          icon: <FileText className="h-4 w-4" />,
        })))
      } catch { setFiles([]) }
    }, 150)
  }, [query])

  // Filter actions
  const filteredActions = query.trim()
    ? ACTIONS.filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
    : ACTIONS

  // Build results
  const results: PaletteItem[] = query.trim()
    ? [...files, ...filteredActions]
    : getRecent().length > 0 ? getRecent() : ACTIONS

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0) }, [results.length])

  const select = useCallback((item: PaletteItem) => {
    trackEvent("palette_select", { type: item.type, item: item.name })
    addRecent(item)
    router.push(item.path)
    setOpen(false)
    setQuery("")
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === "Enter" && results[activeIndex]) { e.preventDefault(); select(results[activeIndex]) }
    else if (e.key === "Escape") { setOpen(false); setQuery("") }
  }

  if (!open) return null

  const fileResults = results.filter(r => r.type === "file")
  const actionResults = results.filter(r => r.type === "action")
  const showSections = query.trim() && (fileResults.length > 0 || actionResults.length > 0)

  let globalIdx = -1

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery("") }}>
      <div className="max-w-lg mx-auto mt-[20vh] rounded-xl border bg-background shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files, actions..."
            className="flex-1 bg-transparent py-4 px-3 text-base outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => { setOpen(false); setQuery("") }} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && query.trim() && (
            <p className="text-sm text-muted-foreground text-center py-8">No results — try a different keyword</p>
          )}
          {!query.trim() && getRecent().length > 0 && (
            <p className="text-xs text-muted-foreground uppercase px-2 py-1 font-medium">Recent</p>
          )}
          {showSections && fileResults.length > 0 && (
            <p className="text-xs text-muted-foreground uppercase px-2 py-1 font-medium">Files</p>
          )}
          {(showSections ? fileResults : results.filter(r => r.type === "file")).map(item => {
            globalIdx++
            const idx = globalIdx
            return (
              <button
                key={item.id}
                onClick={() => select(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors", activeIndex === idx ? "bg-accent" : "hover:bg-muted/50")}
              >
                <span className="text-muted-foreground">{item.icon || <FileText className="h-4 w-4" />}</span>
                <span className="flex-1 truncate">{item.name}</span>
                {item.description && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{item.description}</span>}
              </button>
            )
          })}
          {showSections && actionResults.length > 0 && (
            <p className="text-xs text-muted-foreground uppercase px-2 py-1 font-medium mt-1">Actions</p>
          )}
          {(showSections ? actionResults : results.filter(r => r.type === "action")).map(item => {
            globalIdx++
            const idx = globalIdx
            return (
              <button
                key={item.id}
                onClick={() => select(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors", activeIndex === idx ? "bg-accent" : "hover:bg-muted/50")}
              >
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="flex-1 truncate">{item.name}</span>
              </button>
            )
          })}
        </div>
        <div className="border-t px-4 py-2 text-[11px] text-muted-foreground flex gap-3">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
