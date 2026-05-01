"use client"

import { Suspense, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { FileList } from "@/components/file/file-list"
import { FolderTree } from "@/components/file/folder-tree"
import { useLayoutStore } from "@/stores/layout-store"
import { FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { KnowledgeSkeleton } from "@/components/ui/skeleton-loader"
import { useFiles, useFile } from "@/hooks/use-files"
import { apiFetch } from "@/lib/api"

const MarkdownContent = dynamic(() => import("react-markdown").then(m => m.default), { ssr: false, loading: () => <div className="animate-pulse h-32 bg-muted rounded" /> })

export default function KnowledgePage() {
  return (
    <Suspense fallback={<KnowledgeSkeleton />}>
      <KnowledgePageInner />
    </Suspense>
  )
}

function FileTreeList() {
  const { currentFolderId, selectedFileId, openInspector } = useLayoutStore()
  const { data: filesData } = useFiles(currentFolderId)
  const files = filesData?.files || []

  return (
    <div className="py-1">
      {files.map((file: any) => (
        <button
          key={file.id}
          onClick={() => openInspector(file.id)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors text-left",
            selectedFileId === file.id && "bg-accent text-accent-foreground font-medium"
          )}
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{file.name}</span>
        </button>
      ))}
    </div>
  )
}

function KnowledgePageInner() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  useEffect(() => { document.title = "Knowledge — DriveMem" }, [])

  return (
    <div className="flex h-full page-enter">
      {/* Mobile sidebar toggle */}
      <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden fixed top-16 left-4 z-30 p-2 rounded-lg bg-background border border-border shadow-sm" aria-label="Open file tree">
        <FileText className="h-4 w-4" />
      </button>
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-border flex flex-col z-50 shadow-lg">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium">Files</p>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-3"><FolderTree /></div>
            <div className="flex-1 overflow-y-auto border-t border-border" onClick={() => setMobileSidebarOpen(false)}><FileTreeList /></div>
          </aside>
        </div>
      )}
      {/* Left: File tree (desktop) */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border shrink-0">
        <div className="p-3">
          <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium mb-2">Projects</p>
          <FolderTree />
        </div>
        <div className="flex-1 overflow-y-auto border-t border-border">
          <FileTreeList />
        </div>
      </aside>

      {/* Right: Document content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <PreviewPanel />
      </div>
    </div>
  )
}

function PreviewPanel() {
  const { selectedFileId, closeInspector } = useLayoutStore()
  const { data: file } = useFile(selectedFileId || '')
  const [content, setContent] = useState<string | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isImage = file?.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file?.name || "")

  useEffect(() => {
    if (!selectedFileId) { setContent(null); setImgUrl(null); return }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await apiFetch(`/api/files/${selectedFileId}/preview-url`) as any
        if (cancelled) return
        if (res.content) {
          setContent(res.content)
        } else if (isImage && res.previewUrl) {
          setImgUrl(res.previewUrl)
        } else if (res.previewUrl) {
          const textRes = await fetch(res.previewUrl)
          if (!textRes.ok) throw new Error('fetch failed')
          const text = await textRes.text()
          if (!cancelled) setContent(text.length > 80000 ? text.slice(0, 80000) + '\n\n…(Content truncated)' : text)
        }
      } catch {
        if (!cancelled) setContent(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedFileId, isImage])

  if (!selectedFileId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <svg className="h-12 w-12 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3 className="text-lg font-semibold text-foreground mb-2">Your Knowledge Base</h3>
        <p className="text-sm text-center max-w-sm mb-6">Upload files, create notes, or connect data sources. AI automatically understands and organizes your knowledge.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/files" className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">Upload a file</a>
          <a href="/chat" className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors text-center">Try AI Chat</a>
          <a href="/settings#developer" className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors text-center">Connect MCP</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate">{file?.name || 'Loading...'}</h3>
        </div>
        <button onClick={closeInspector} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0 ml-2">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="flex items-center justify-center py-12"><div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>}
        {!loading && imgUrl && (
          <div className="flex items-center justify-center">
            <img src={imgUrl} alt={file?.name || "Preview"} className="max-w-full max-h-[70vh] rounded-lg" />
          </div>
        )}
        {!loading && content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownContent>{content}</MarkdownContent>
          </div>
        )}
        {!loading && !content && !imgUrl && selectedFileId && (
          <p className="text-sm text-muted-foreground text-center py-8">Unable to preview this file</p>
        )}
        {/* File Details at bottom */}
        {file && !loading && (
          <div className="border-t border-border mt-8 pt-4 px-1">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Source: {file.source || 'upload'}</span>
              <span>·</span>
              <span>{file.mimeType || 'unknown'}</span>
              <span>·</span>
              <span>{file.size ? (file.size < 1024 ? file.size + ' B' : (file.size/1024).toFixed(1) + ' KB') : ''}</span>
              <span>·</span>
              <span>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
