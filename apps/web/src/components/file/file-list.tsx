"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FileText, Loader2, CheckCircle2, XCircle, ArrowUpDown, Upload, AlertCircle, FolderPlus, Folder, ChevronRight, MessageSquare, LayoutGrid, List } from "lucide-react"
import { Lightbulb } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLayoutStore } from "@/stores/layout-store"
import { useFiles, useDeleteFile, useRenameFile, useMoveFile } from "@/hooks/use-files"
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
import { FileUpload } from "./file-upload"
import { FirstUploadGuide } from "@/components/onboarding/first-upload-guide"

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
  const ext = name?.split(".").pop()?.toLowerCase()
  const colorByExt: Record<string, string> = {
    pdf: "text-red-500",
    doc: "text-blue-600", docx: "text-blue-600",
    md: "text-green-500", markdown: "text-green-500",
    txt: "text-gray-500",
  }
  const colorByType: Record<string, string> = {
    pdf: "text-red-500",
    txt: "text-gray-500",
    md: "text-green-500",
    image: "text-blue-400",
  }
  const color = (ext && colorByExt[ext]) || colorByType[type] || "text-muted-foreground"
  return <FileText className={cn("h-4 w-4 flex-shrink-0", className, color)} />
}

function StatusIcon({ status, error, compact }: { status: string; error?: string; compact?: boolean }) {
  if (status === "uploading") return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
  if (status === "parsing") {
    if (compact) return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
    return <span className="flex items-center gap-1 text-xs text-yellow-500"><Loader2 className="h-3 w-3 animate-spin" />AI 正在记住...</span>
  }
  if (status === "indexed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
  if (compact) return <XCircle className="h-3.5 w-3.5 text-red-500" />
  return <span title="解析失败，请重新上传" className="flex items-center gap-1 text-xs text-red-500"><XCircle className="h-3.5 w-3.5" />解析失败</span>
}

export function FileList() {
  const { currentFolderId, setCurrentFolder, openInspector, selectedFileId } = useLayoutStore()
  const router = useRouter()
  const { data, isLoading, error } = useFiles(currentFolderId)
  const deleteFile = useDeleteFile()
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
  const [moveFolderId, setMoveFolderId] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const parentRef = useRef<HTMLDivElement>(null)

  const rawFiles: FileItem[] = Array.isArray(data) ? data : (data?.files || [])

  const files = useMemo(() => {
    return [...rawFiles].sort((a, b) => {
      const m = sortDir === "asc" ? 1 : -1
      if (sortKey === "name") return a.name.localeCompare(b.name) * m
      if (sortKey === "size") return (a.size - b.size) * m
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * m
    })
  }, [rawFiles, sortKey, sortDir])

  const FILTERS = [
    { key: "all", label: "全部" },
    { key: "pdf", label: "PDF" },
    { key: "word", label: "Word" },
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
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
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

  return (
    <div className="flex h-full flex-col" onDragOver={(e) => { e.preventDefault() }} onDrop={(e) => { e.preventDefault(); setShowUpload(true) }}>
      {/* Toolbar: filters left, actions right */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-1">
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
          <Button size="sm" onClick={() => { setNewFolderName(""); setFolderDialogOpen(true) }} variant="outline" className="gap-1"><FolderPlus className="h-3.5 w-3.5" />新建文件夹</Button>
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
      {viewMode === "grid" && visibleFolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border-b border-border">
          {visibleFolders.map((folder: any) => (
            <div key={folder.id} className="rounded-xl border p-4 hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-2" onClick={() => setCurrentFolder(folder.id)}>
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
      {viewMode === "list" && visibleFolders.length > 0 && (
        <div className="border-b border-border">
          {visibleFolders.map((folder: any) => (
            <div key={folder.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setCurrentFolder(folder.id)}>
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
                className={cn("group absolute left-0 top-0 flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 hover:bg-accent/50 transition-colors", isSel && "bg-accent")}
                style={{ height: row.size + "px", transform: "translateY(" + row.start + "px)" }}>
                <TypeIcon type={file.type} name={file.name} />
                <span className="truncate text-sm flex-1 min-w-0">{file.name}</span>
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
                <span className="w-20 text-right text-xs text-muted-foreground shrink-0">{formatRelativeTime(file.updatedAt || file.createdAt)}</span>
                <span className="w-16 text-right text-xs text-muted-foreground shrink-0">{fmtSize(file.size)}</span>
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
                  className={cn("rounded-xl border p-4 hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-2", isSel && "bg-accent ring-2 ring-primary")}
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
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {selected.size > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-2">
          <span className="text-sm">已选择 {selected.size} 个文件</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>取消</Button>
            <Button variant="destructive" size="sm" onClick={() => { selected.forEach(id => deleteFile.mutate(id)); setSelected(new Set()) }}>删除</Button>
          </div>
        </div>
      )}
      <FirstUploadGuide hasIndexedFile={files.some((f: any) => f.status === "indexed")} />
      {filteredFiles.length < 5 && filteredFiles.length > 0 && (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/50">
          拖拽文件到这里上传，或使用 Web Clipper 保存网页
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
