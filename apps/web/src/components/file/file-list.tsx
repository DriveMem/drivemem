"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FileText, Loader2, CheckCircle2, XCircle, ArrowUpDown, Upload, AlertCircle, FolderPlus, Folder, ChevronRight, MessageSquare, LayoutGrid, List, Download, Share2 } from "lucide-react"
import { Lightbulb } from "lucide-react"
import { getFileIcon } from "@/lib/get-file-icon"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { apiFetch } from "@/lib/api"
import { useLayoutStore } from "@/stores/layout-store"
import { useFiles, useDeleteFile, useRenameFile, useMoveFile } from "@/hooks/use-files"
import { useQueryClient } from "@tanstack/react-query"
import { useCreateFolder, useFolders } from "@/hooks/use-folders"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { FileListSkeleton } from "@/components/skeletons/file-list-skeleton"
import { FileUpload } from "./file-upload"
import { FirstUploadGuide } from "@/components/onboarding/first-upload-guide"
import { toast } from "sonner"

type SortKey = "name" | "createdAt" | "size"
type SortDir = "asc" | "desc"

interface FileItem {
  id: string
  name: string
  type: string
  size: number
  folderId: string | null
  createdAt: string
  updatedAt: string
  status: "uploading" | "parsing" | "indexed" | "failed"
  errorMessage?: string
  summary?: string | null
  suggestedFolder?: string | null
  previousVersionId?: string | null
}

function fmtSize(b: number) { return !b ? "—" : b < 1024 ? "< 1 KB" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB" }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }

function formatRelativeTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString("zh-CN")
}

function TypeIcon({ type, name, className }: { type: string; name?: string; className?: string }) {
  const { icon: Icon, colorClass } = getFileIcon(name || type, type)
  return <Icon className={cn("h-4 w-4 flex-shrink-0", className, colorClass)} />
}

function StatusIcon({ status, error, compact }: { status: string; error?: string; compact?: boolean }) {
  if (status === "uploading") return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
  if (status === "parsing") {
    if (compact) return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
    return <span className="flex items-center gap-1 text-xs text-yellow-500"><Loader2 className="h-3 w-3 animate-spin" />AI 正在记住...</span>
  }
  if (status === "indexed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
  if (compact) return <span title={error || "索引失败，请重新上传"} className="cursor-help"><XCircle className="h-3.5 w-3.5 text-red-500" /></span>
  return <span title={error || "解析失败"} className="flex items-center gap-1 text-xs text-red-500 cursor-help"><XCircle className="h-3.5 w-3.5" />索引失败</span>
}

export function FileList() {
  const { currentFolderId, setCurrentFolder, openInspector, selectedFileId } = useLayoutStore()
  const router = useRouter()
  const { data, isLoading, error } = useFiles(currentFolderId)
  const deleteFile = useDeleteFile()
  const queryClient = useQueryClient()
  const renameFile = useRenameFile()
  const moveFile = useMoveFile()
  const createFolder = useCreateFolder()
  const { data: foldersData } = useFolders()
  const allFolders = foldersData?.folders || []
  const currentFolder = allFolders.find((f: any) => f.id === currentFolderId) || null
  const visibleFolders = allFolders.filter((f: any) => currentFolderId ? f.parentId === currentFolderId : !f.parentId)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [contextMenu, setContextMenu] = useState<{ fileId: string; x: number; y: number } | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ fileId: string; currentName: string } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [batchMoveOpen, setBatchMoveOpen] = useState(false)
  const [moveFolderId, setMoveFolderId] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [shareLoading, setShareLoading] = useState(false)
  const [sharePermission, setSharePermission] = useState<"view" | "download">("view")
  const [shareFileId, setShareFileId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [inlineNewFolder, setInlineNewFolder] = useState(false)
  const [inlineNewFolderName, setInlineNewFolderName] = useState("新建文件夹")
  const inlineFolderInputRef = useRef<HTMLInputElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Ctrl+Shift+N shortcut for quick folder creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault()
        setInlineNewFolderName("新建文件夹")
        setInlineNewFolder(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-focus inline folder input
  useEffect(() => {
    if (inlineNewFolder && inlineFolderInputRef.current) {
      inlineFolderInputRef.current.focus()
      inlineFolderInputRef.current.select()
    }
  }, [inlineNewFolder])

  const handleInlineFolderSave = useCallback(() => {
    const name = inlineNewFolderName.trim()
    if (name) {
      createFolder.mutate({ name, parentId: currentFolderId }, {
        onSuccess: () => toast.success(`文件夹「${name}」已创建`),
        onError: (err: any) => toast.error(err?.message || "创建文件夹失败"),
      })
    }
    setInlineNewFolder(false)
  }, [inlineNewFolderName, createFolder, currentFolderId])

  const handleShare = useCallback(async (fileId: string) => {
    setShareLoading(true)
    setShareDialogOpen(true)
    setShareFileId(fileId)
    try {
      const data = await apiFetch(`/api/files/${fileId}/share`, { method: "POST", body: JSON.stringify({ permission: sharePermission }) })
      setShareUrl(data.url || "")
    } catch (err) {
      console.error("Share failed:", err)
      toast.error("分享失败，请重试")
      setShareDialogOpen(false)
    } finally {
      setShareLoading(false)
    }
  }, [sharePermission])

  const handleDownload = useCallback(async (fileId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const data = await apiFetch(`/api/files/${fileId}/preview-url`)
      const url = typeof data === 'string' ? data : data?.url || data?.previewUrl
      if (url) window.open(url, '_blank')
    } catch (err) {
      console.error('Download failed:', err)
    }
  }, [])

  const handleBatchDelete = useCallback(() => {
    selected.forEach(id => deleteFile.mutate(id))
    setSelected(new Set())
  }, [selected, deleteFile])

  const handleBatchDownload = useCallback(async () => {
    for (const id of selected) {
      await handleDownload(id)
    }
  }, [selected, handleDownload])

  const handleBatchMove = useCallback((folderId: string | null) => {
    selected.forEach(id => moveFile.mutate({ fileId: id, folderId }))
    setSelected(new Set())
    setBatchMoveOpen(false)
  }, [selected, moveFile])

  const rawFiles: FileItem[] = Array.isArray(data) ? data : (data?.files || [])

  const files = useMemo(() => {
    return [...rawFiles].sort((a, b) => {
      const m = sortDir === "asc" ? 1 : -1
      if (sortKey === "name") return a.name.localeCompare(b.name) * m
      if (sortKey === "size") return (a.size - b.size) * m
      return (new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime()) * m
    })
  }, [rawFiles, sortKey, sortDir])

  const FILTERS = [
    { key: "all", label: "全部" },
    { key: "pdf", label: "PDF" },
    { key: "word", label: "Word" },
    { key: "ppt", label: "PPT" },
    { key: "excel", label: "Excel" },
    { key: "md", label: "Markdown" },
    { key: "txt", label: "文本" },
    { key: "image", label: "图片" },
  ]

  const filteredFiles = typeFilter === "all" ? files : files.filter((f: any) => {
    const ext = (f.name || f.originalName || "").split(".").pop()?.toLowerCase()
    const mime = f.mimeType || ""
    switch (typeFilter) {
      case "pdf": return ext === "pdf" || mime.includes("pdf")
      case "word": return ext === "docx" || ext === "doc" || mime.includes("word")
      case "ppt": return ext === "pptx" || ext === "ppt" || mime.includes("presentation")
      case "excel": return ext === "xlsx" || ext === "xls" || mime.includes("spreadsheet")
      case "md": return ext === "md" || ext === "markdown"
      case "txt": return ext === "txt" || mime === "text/plain"
      case "image": return mime.startsWith("image/") || ["png","jpg","jpeg","gif","webp"].includes(ext || "")
      default: return true
    }
  })

  const virt = useVirtualizer({ count: filteredFiles.length, getScrollElement: () => parentRef.current, estimateSize: () => 48, overscan: 5 })

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc") } }

  const handleClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
    } else if (e.shiftKey) {
      const ci = files.findIndex((f) => f.id === id)
      const fi = files.findIndex((f) => selected.has(f.id))
      if (fi >= 0) { const [s, e2] = [Math.min(fi, ci), Math.max(fi, ci)]; setSelected(new Set(files.slice(s, e2 + 1).map((f) => f.id))) }
      else setSelected(new Set([id]))
    } else { setSelected(new Set([id])); openInspector(id) }
  }, [files, selected, openInspector])

  if (isLoading) {
    return <FileListSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" /><p className="text-sm">加载文件失败: {(error as Error).message}</p>
      </div>
    )
  }

  if (files.length === 0 && !showUpload && !currentFolderId && visibleFolders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setShowUpload(true) }}
      >
        <Upload className="h-12 w-12" /><p className="text-lg">把文件拖到这里，让 AI 记住它</p>
        <Button onClick={() => setShowUpload(true)}>让 AI 记住文件</Button>
        {showUpload && <FileUpload onClose={() => setShowUpload(false)} folderId={currentFolderId} />}
      </div>
    )
  }

  if (files.length === 0 && !showUpload && currentFolderId && visibleFolders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setShowUpload(true) }}
      >
        <Folder className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg font-medium text-foreground">这个文件夹还是空的</p>
        <p className="text-sm">拖拽文件到这里，或点击上传</p>
        <Button onClick={() => setShowUpload(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Upload className="h-4 w-4" />上传文件
        </Button>
        {showUpload && <FileUpload onClose={() => setShowUpload(false)} folderId={currentFolderId} />}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" onDragOver={(e) => { e.preventDefault() }} onDrop={(e) => { e.preventDefault(); setShowUpload(true) }}>
      {/* Toolbar: filters left, actions right */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-1">
          <Checkbox
            checked={filteredFiles.length > 0 && filteredFiles.every(f => selected.has(f.id))}
            onCheckedChange={(checked) => {
              if (checked) setSelected(new Set(filteredFiles.map(f => f.id)))
              else setSelected(new Set())
            }}
            className="mr-2"
          />
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition",
                typeFilter === key
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={async () => {
            try {
              const { toast } = await import("sonner")
              toast.info("AI 正在整理文件...")
              const data = await apiFetch("/api/files/auto-organize", { method: "POST" })
              toast.success(data?.message || "整理完成")
              queryClient.invalidateQueries({ queryKey: ["files"] })
              queryClient.invalidateQueries({ queryKey: ["folders"] })
            } catch (e: any) { const { toast } = await import("sonner"); toast.error(e.message || "整理失败") }
          }} variant="outline" className="gap-1">✨ 一键整理</Button>
          <Button size="sm" onClick={() => { setInlineNewFolderName("新建文件夹"); setInlineNewFolder(true) }} variant="outline" className="gap-1" title="Ctrl+Shift+N"><FolderPlus className="h-3.5 w-3.5" />📁 新建文件夹</Button>
          <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"><Upload className="h-3.5 w-3.5" />让 AI 记住</Button>
          <div className="flex items-center rounded-md border border-border ml-2">
            <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-r-none", viewMode === "list" && "bg-accent")} onClick={() => setViewMode("list")}><List className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-l-none", viewMode === "grid" && "bg-accent")} onClick={() => setViewMode("grid")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} folderId={currentFolderId} />}
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground border-b border-border">
        <span className={cn("cursor-pointer hover:text-foreground", !currentFolderId && "text-foreground font-medium")} onClick={() => setCurrentFolder(null)}>所有文件</span>
        {(() => {
          if (!currentFolderId) return null
          // Build full path from root to current folder
          const path: Array<{ id: string; name: string }> = []
          let f = allFolders.find((f: any) => f.id === currentFolderId)
          while (f) {
            path.unshift({ id: f.id, name: f.name })
            f = f.parentId ? allFolders.find((p: any) => p.id === f!.parentId) : null
          }
          return path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <span className={cn("cursor-pointer hover:text-foreground", i === path.length - 1 && "text-foreground font-medium")} onClick={() => setCurrentFolder(i === path.length - 1 ? p.id : p.id)}>
                {p.name}
              </span>
            </span>
          ))
        })()}
      </div>
      {viewMode === "grid" && (visibleFolders.length > 0 || inlineNewFolder) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border-b border-border">
          {inlineNewFolder && (
            <div className="rounded-xl border-2 border-dashed border-blue-400 p-4 flex flex-col gap-2 bg-blue-500/5">
              <div className="flex h-20 items-center justify-center rounded-lg bg-muted">
                <Folder className="h-10 w-10 text-amber-500" />
              </div>
              <input
                ref={inlineFolderInputRef}
                value={inlineNewFolderName}
                onChange={(e) => setInlineNewFolderName(e.target.value)}
                onBlur={handleInlineFolderSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleInlineFolderSave(); if (e.key === "Escape") setInlineNewFolder(false) }}
                className="text-sm font-medium bg-transparent border-b border-blue-400 outline-none px-1"
              />
            </div>
          )}
          {visibleFolders.map((folder: any) => (
            <div key={folder.id} className={cn("rounded-xl border p-4 hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-2", dragOverFolderId === folder.id && "ring-2 ring-blue-500 bg-blue-500/10")}
              onClick={() => setCurrentFolder(folder.id)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolderId(folder.id) }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const fileId = e.dataTransfer.getData("text/plain"); if (fileId) { moveFile.mutate({ fileId, folderId: folder.id }); toast.success(`已移入 ${folder.name}`) } setDragOverFolderId(null) }}
            >
              <div className="flex h-20 items-center justify-center rounded-lg bg-muted">
                <Folder className="h-10 w-10 text-amber-500" />
              </div>
              <p className="text-sm font-medium truncate">{folder.name}</p>
              {typeof folder.fileCount === "number" && (
                <p className="text-xs text-muted-foreground">{folder.fileCount} 个文件</p>
              )}
            </div>
          ))}
        </div>
      )}
      {viewMode === "list" && (visibleFolders.length > 0 || inlineNewFolder) && (
        <div className="border-b border-border">
          {inlineNewFolder && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-500/5 border-b border-dashed border-blue-400">
              <Folder className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <input
                ref={viewMode === "list" ? inlineFolderInputRef : undefined}
                value={inlineNewFolderName}
                onChange={(e) => setInlineNewFolderName(e.target.value)}
                onBlur={handleInlineFolderSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleInlineFolderSave(); if (e.key === "Escape") setInlineNewFolder(false) }}
                className="text-sm bg-transparent border-b border-blue-400 outline-none flex-1"
              />
            </div>
          )}
          {visibleFolders.map((folder: any) => (
            <div key={folder.id} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors", dragOverFolderId === folder.id && "ring-2 ring-blue-500 bg-blue-500/10")}
              onClick={() => setCurrentFolder(folder.id)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolderId(folder.id) }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const fileId = e.dataTransfer.getData("text/plain"); if (fileId) { moveFile.mutate({ fileId, folderId: folder.id }); toast.success(`已移入 ${folder.name}`) } setDragOverFolderId(null) }}
            >
              <Folder className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span className="text-sm truncate">{folder.name}</span>
              {typeof folder.fileCount === "number" && (
                <span className="text-xs text-muted-foreground">({folder.fileCount})</span>
              )}
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      {viewMode === "list" ? (
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: virt.getTotalSize() + "px", width: "100%", position: "relative" }}>
          {virt.getVirtualItems().map((row) => {
            const file = filteredFiles[row.index]
            const isSel = selected.has(file.id) || selectedFileId === file.id
            return (
              <div key={file.id} onClick={(e) => handleClick(file.id, e)} onDoubleClick={() => router.push(`/files/${file.id}/preview`)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY }) }}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", file.id); e.dataTransfer.effectAllowed = "move" }}
                className={cn("group absolute left-0 top-0 flex w-full cursor-grab items-center gap-3 border-b border-border px-4 hover:bg-accent/50 transition-colors", isSel && "bg-accent")}
                style={{ height: row.size + "px", transform: "translateY(" + row.start + "px)" }}>
                <Checkbox
                  checked={selected.has(file.id)}
                  onCheckedChange={(checked) => {
                    setSelected(p => { const n = new Set(p); checked ? n.add(file.id) : n.delete(file.id); return n })
                  }}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  className="shrink-0"
                />
                <TypeIcon type={file.type} name={file.name} />
                <span className="truncate text-sm flex-1 min-w-0">{file.name}</span>
                {file.previousVersionId && <span className="shrink-0 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-500">已更新</span>}
                {file.suggestedFolder && !file.folderId && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="shrink-0 text-blue-500 hover:text-blue-600 transition-colors" onClick={(e) => {
                          e.stopPropagation()
                          const matched = allFolders.find((f: any) => f.name === file.suggestedFolder)
                          if (matched) { moveFile.mutate({ fileId: file.id, folderId: matched.id }) } else { alert("请先创建此文件夹") }
                        }}>
                          <Lightbulb className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>AI 建议归入：{file.suggestedFolder}（点击移入）</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <StatusIcon status={file.status} error={file.errorMessage} compact />
                <span className="w-20 text-right text-xs text-muted-foreground shrink-0" suppressHydrationWarning>{formatRelativeTime(file.updatedAt || file.createdAt)}</span>
                <span className="w-16 text-right text-xs text-muted-foreground shrink-0">{fmtSize(file.size)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => handleDownload(file.id, e)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {filteredFiles.map((file) => {
              const isSel = selected.has(file.id) || selectedFileId === file.id
              return (
                <div
                  key={file.id}
                  onClick={(e) => handleClick(file.id, e)}
                  onDoubleClick={() => router.push(`/files/${file.id}/preview`)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY }) }}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", file.id); e.dataTransfer.effectAllowed = "move" }}
                  className={cn("rounded-xl border p-4 hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-grab flex flex-col gap-2", isSel && "bg-accent ring-2 ring-primary")}
                >
                  <div className="flex h-20 items-center justify-center rounded-lg bg-muted">
                    <TypeIcon type={file.type} name={file.name} className="h-10 w-10" />
                  </div>
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{file.summary}</p>
                  )}
                  {file.suggestedFolder && !file.folderId && (
                    <span className="text-xs text-blue-500">💡 {file.suggestedFolder}</span>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <StatusIcon status={file.status} error={file.errorMessage} />
                    <span className="text-[10px] text-muted-foreground">{fmtSize(file.size)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {contextMenu && (
        <DropdownMenu open onOpenChange={(open) => { if (!open) setContextMenu(null) }}>
          <DropdownMenuTrigger asChild>
            <div style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, width: 1, height: 1 }} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => {
              const file = files.find(f => f.id === contextMenu.fileId)
              setRenameTarget({ fileId: contextMenu.fileId, currentName: file?.name || "" })
              setRenameValue(file?.name || "")
              setContextMenu(null)
            }}>重命名</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setDeleteTarget(contextMenu.fileId)
              setContextMenu(null)
            }}>删除</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setMoveTarget(contextMenu.fileId)
              setMoveFolderId("")
              setContextMenu(null)
            }}>移动到文件夹</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              handleShare(contextMenu.fileId)
              setContextMenu(null)
            }}>
              <Share2 className="h-4 w-4 mr-2" />分享
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-background/80 backdrop-blur-md border shadow-lg px-5 py-3 z-50">
          <span className="text-sm font-medium">已选 {selected.size} 个文件</span>
          <Button variant="outline" size="sm" onClick={handleBatchDelete} className="gap-1">🗑️ 批量删除</Button>
          <Button variant="outline" size="sm" onClick={handleBatchDownload} className="gap-1">📥 批量下载</Button>
          <Button variant="outline" size="sm" onClick={() => setBatchMoveOpen(true)}>移动</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>❌ 取消选择</Button>
        </div>
      )}
      <FirstUploadGuide hasIndexedFile={files.some((f: any) => f.status === "indexed")} />
      {filteredFiles.length < 5 && filteredFiles.length > 0 && (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/50">
          拖拽文件到这里上传
        </div>
      )}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
          </DialogHeader>
          <Input placeholder="文件夹名称" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) { createFolder.mutate({ name: newFolderName.trim(), parentId: currentFolderId }); setFolderDialogOpen(false) } }} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>取消</Button>
            <Button onClick={() => { if (newFolderName.trim()) { createFolder.mutate({ name: newFolderName.trim(), parentId: currentFolderId }); setFolderDialogOpen(false) } }} disabled={!newFolderName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>重命名文件</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && renameValue.trim() && renameTarget) { renameFile.mutate({ fileId: renameTarget.fileId, name: renameValue.trim() }); setRenameTarget(null) } }} placeholder="输入新名称" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>取消</Button>
            <Button disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.currentName} onClick={() => { if (renameTarget) { renameFile.mutate({ fileId: renameTarget.fileId, name: renameValue.trim() }); setRenameTarget(null) } }}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定要删除此文件吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={() => { if (deleteTarget) { deleteFile.mutate(deleteTarget); setDeleteTarget(null) } }}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Move Dialog */}
      <Dialog open={batchMoveOpen} onOpenChange={(open) => { if (!open) setBatchMoveOpen(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>批量移动到文件夹</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <button onClick={() => setMoveFolderId("")} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent", moveFolderId === "" && "bg-accent font-medium")}>
              <FileText className="h-4 w-4" /> 根目录
            </button>
            {allFolders.map((f: any) => (
              <button key={f.id} onClick={() => setMoveFolderId(f.id)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent", moveFolderId === f.id && "bg-accent font-medium")}>
                <Folder className="h-4 w-4 text-amber-500" /> {f.name}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchMoveOpen(false)}>取消</Button>
            <Button onClick={() => handleBatchMove(moveFolderId || null)}>移动</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>分享链接</DialogTitle></DialogHeader>
          {shareLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">权限设置</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sharePermission" value="view" checked={sharePermission === "view"} onChange={() => setSharePermission("view")} className="accent-blue-600" />
                    <span className="text-sm">仅查看</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sharePermission" value="download" checked={sharePermission === "download"} onChange={() => setSharePermission("download")} className="accent-blue-600" />
                    <span className="text-sm">可下载</span>
                  </label>
                </div>
              </div>
              <Input value={shareUrl} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>关闭</Button>
                <Button variant="outline" onClick={() => { if (shareFileId) handleShare(shareFileId) }}>更新权限</Button>
                <Button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("已复制") }}>复制</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => { if (!open) setMoveTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>移动到文件夹</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <button onClick={() => setMoveFolderId("")} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent", moveFolderId === "" && "bg-accent font-medium")}>
              <FileText className="h-4 w-4" /> 根目录
            </button>
            {allFolders.map((f: any) => (
              <button key={f.id} onClick={() => setMoveFolderId(f.id)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent", moveFolderId === f.id && "bg-accent font-medium")}>
                <Folder className="h-4 w-4 text-amber-500" /> {f.name}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTarget(null)}>取消</Button>
            <Button onClick={() => { if (moveTarget) { moveFile.mutate({ fileId: moveTarget, folderId: moveFolderId || null }); setMoveTarget(null) } }}>移动</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
