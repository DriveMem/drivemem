"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { FileList } from "@/components/file/file-list"
import { FolderTree } from "@/components/file/folder-tree"
import { WorkItemsPanel } from "@/components/dashboard/work-items-panel"
import { useTags } from "@/hooks/use-tags"
import { useLayoutStore } from "@/stores/layout-store"
import { List, Network, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { KnowledgeSkeleton } from "@/components/ui/skeleton-loader"
import { useFiles, useFile } from "@/hooks/use-files"
import { apiFetch } from "@/lib/api"

const MarkdownContent = dynamic(() => import("react-markdown").then(m => m.default), { ssr: false, loading: () => <div className="animate-pulse h-32 bg-muted rounded" /> })

const GraphEmbed = dynamic(() => import("@/app/(app)/graph/page"), { ssr: false })

interface StaleFile {
  fileId: string
  fileName: string
  reason: string
  lastAccessedAt: string
  staleSince: string
  staleScore: number
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={<KnowledgeSkeleton />}>
      <KnowledgePageInner />
    </Suspense>
  )
}

function KnowledgePageInner() {
  const [view, setView] = useState<"list" | "graph">("list")
  const { activeTagFilter, setActiveTagFilter, currentFolderId, activeSourceFilter, setActiveSourceFilter } = useLayoutStore()
  const { data: tags = [], isLoading: tagsLoading } = useTags()
  const { isLoading: filesLoading } = useFiles(currentFolderId)
  const searchParams = useSearchParams()
  const router = useRouter()
  const filterStale = searchParams.get("filter") === "stale"
  const [staleFiles, setStaleFiles] = useState<StaleFile[]>([])
  const [staleLoading, setStaleLoading] = useState(false)

  useEffect(() => { document.title = "Knowledge — DriveMem" }, [])

  useEffect(() => {
    if (!filterStale) return
    setStaleLoading(true)
    apiFetch("/api/files/stale", { silent: true })
      .then((data: any) => {
        const files = data?.staleFiles || []
        // Filter out files dismissed within 30 days via localStorage
        const dismissed = JSON.parse(localStorage.getItem('dismissedOutdatedFiles') || '{}')
        const now = Date.now()
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
        const filtered = files.filter((f: StaleFile) => {
          const dismissedAt = dismissed[f.fileId]
          if (dismissedAt && (now - new Date(dismissedAt).getTime()) < THIRTY_DAYS) return false
          return true
        })
        // Clean up expired dismissals
        let cleaned = false
        for (const [id, ts] of Object.entries(dismissed)) {
          if ((now - new Date(ts as string).getTime()) >= THIRTY_DAYS) { delete dismissed[id]; cleaned = true }
        }
        if (cleaned) localStorage.setItem('dismissedOutdatedFiles', JSON.stringify(dismissed))
        setStaleFiles(filtered)
      })
      .catch(() => {})
      .finally(() => setStaleLoading(false))
  }, [filterStale])

  const handleDismiss = useCallback(async (fileId: string) => {
    try {
      await apiFetch(`/api/files/stale/${fileId}/dismiss`, { method: "POST", silent: true })
      // Also store in localStorage for 30-day client-side dismiss
      const dismissed = JSON.parse(localStorage.getItem('dismissedOutdatedFiles') || '{}')
      dismissed[fileId] = new Date().toISOString()
      localStorage.setItem('dismissedOutdatedFiles', JSON.stringify(dismissed))
      setStaleFiles((prev) => prev.filter((f) => f.fileId !== fileId))
    } catch {}
  }, [])

  if (filesLoading && tagsLoading) {
    return <KnowledgeSkeleton />
  }

  return (
    <div className="flex h-full page-enter">
      {/* Left panel — Projects + Tags */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border shrink-0 overflow-y-auto">
        <div className="p-3">
          <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium mb-2">Projects</p>
          <FolderTree />
        </div>
        <div className="border-t border-border p-3">
          <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium mb-2">Source</p>
          <div className="space-y-0.5">
            {[
              { key: null, label: 'All Files' },
              { key: 'files', label: 'My Files' },
              { key: 'agent', label: 'Agent Notes' },
              { key: 'insights', label: 'Insights' },
              { key: 'synced', label: 'Synced' },
            ].map(item => (
              <button
                key={item.key || 'all'}
                onClick={() => setActiveSourceFilter(item.key)}
                className={cn(
                  "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors",
                  activeSourceFilter === item.key ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {tags.length > 0 && (
          <div className="border-t border-border p-3">
            <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {activeTagFilter && (
                <button onClick={() => setActiveTagFilter(null)} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80">
                  All ×
                </button>
              )}
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  onClick={() => setActiveTagFilter(activeTagFilter === tag.name ? null : tag.name)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
                    activeTagFilter === tag.name ? "ring-1 ring-offset-1" : "opacity-70 hover:opacity-100"
                  )}
                  style={{ backgroundColor: tag.color + "20", color: tag.color }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Right panel — File List or Graph */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar with view toggle */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border min-w-0">
          <h1 className="text-body font-medium shrink-0">Knowledge</h1>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5 shrink-0">
            <button
              onClick={() => setView("list")}
              className={cn("px-2.5 py-1 text-caption rounded", view === "list" ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
              title="List view"
            >
              <List className="h-3.5 w-3.5 inline sm:mr-1" /><span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView("graph")}
              className={cn("px-2.5 py-1 text-caption rounded", view === "graph" ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
              title="Graph view"
            >
              <Network className="h-3.5 w-3.5 inline sm:mr-1" /><span className="hidden sm:inline">Graph</span>
            </button>
          </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
        {filterStale ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Stale banner */}
            <div className="mx-4 mt-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">These files may be outdated</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Review and dismiss files that are still relevant, or update their content.</p>
              </div>
              <Link href="/files" className="text-xs font-medium text-amber-700 dark:text-amber-400 underline hover:no-underline whitespace-nowrap">Show all files</Link>
            </div>

            {staleLoading ? (
              <div className="p-4"><KnowledgeSkeleton /></div>
            ) : staleFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">No stale files found.</p>
                <Link href="/files" className="text-xs mt-2 underline hover:no-underline">Show all files</Link>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {staleFiles.map((file) => (
                  <div key={file.fileId} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link href={`/files/${file.fileId}`} className="text-sm font-medium hover:underline truncate block">{file.fileName}</Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{file.reason}</p>
                      {file.staleSince && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Stale since {new Date(file.staleSince).toLocaleDateString()}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDismiss(file.fileId)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border border-border hover:bg-muted transition-colors"
                    >
                      <X className="h-3 w-3" />Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : view === "list" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Work Items for selected project */}
            {currentFolderId && (
              <div className="px-4 pt-4">
                <WorkItemsPanel folderId={currentFolderId} defaultExpanded />
              </div>
            )}
            <FileList />
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <GraphEmbed />
          </div>
        )}
        </div>
        {/* Preview panel */}
        <div className="hidden lg:flex w-[45%] border-l border-border flex-col">
          <PreviewPanel />
        </div>
        </div>
      </div>
    </div>
  )
}

function PreviewPanel() {
  const { selectedFileId } = useLayoutStore()
  const { data: file } = useFile(selectedFileId || '')
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedFileId) { setContent(null); return }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await apiFetch(`/api/files/${selectedFileId}/preview-url`) as { previewUrl: string }
        if (cancelled) return
        const textRes = await fetch(res.previewUrl)
        if (!textRes.ok) throw new Error('fetch failed')
        const text = await textRes.text()
        if (!cancelled) setContent(text.length > 50000 ? text.slice(0, 50000) + '\n\n…' : text)
      } catch {
        if (!cancelled) setContent(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedFileId])

  if (!selectedFileId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <svg className="h-12 w-12 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p className="text-sm">Select a file to preview</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold truncate">{file?.name || 'Loading...'}</h3>
        {file && <p className="text-xs text-muted-foreground mt-0.5">{file.mimeType} · {file.size ? (file.size < 1024 ? file.size + ' B' : (file.size / 1024).toFixed(1) + ' KB') : ''}</p>}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="flex items-center justify-center py-12"><div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>}
        {!loading && content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownContent content={content} />
          </div>
        )}
        {!loading && !content && selectedFileId && (
          <p className="text-sm text-muted-foreground text-center py-8">Unable to preview this file</p>
        )}
      </div>
    </div>
  )
}
