"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FileText, Loader2, CheckCircle2, XCircle, ArrowUpDown, Upload, AlertCircle, FolderPlus, Folder, ChevronRight, MessageSquare, LayoutGrid, List, Download, Share2, MoreHorizontal, BotMessageSquare, Link2, Info, X, Sparkles } from "lucide-react"
import { Lightbulb, Tag } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { FileUpload } from "./file-upload"
import { TagManagerDialog } from "./tag-manager-dialog"
import { useTags, useAddTagToFile, useRemoveTagFromFile } from "@/hooks/use-tags"
import { FirstUploadGuide } from "@/components/onboarding/first-upload-guide"
import { toast } from "sonner"

type SortKey = "name" | "createdAt" | "size" | "type"
type SortDir = "asc" | "desc"

interface FileItem {
  id: string
  name: string
  type: string
  mimeType?: string
  size: number
  folderId: string | null
  createdAt: string
  updatedAt: string
  status: "uploading" | "parsing" | "indexed" | "failed"
  errorMessage?: string
  summary?: string | null
  suggestedFolder?: string | null
  previousVersionId?: string | null
  archivedAt?: string | null
  tags?: { name: string; color?: string }[]
}

function fmtSize(b: number) { return !b ? "—" : b < 1024 ? "< 1 KB" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB" }

function formatFileType(mimeType?: string, name?: string): string {
  if (name) {
    const ext = name.split(".").pop()?.toLowerCase()
    const extMap: Record<string, string> = {
      md: "Markdown", markdown: "Markdown", txt: "纯文本", pdf: "PDF",
      doc: "Word", docx: "Word", xls: "Excel", xlsx: "Excel",
      ppt: "PowerPoint", pptx: "PowerPoint", csv: "CSV",
      json: "JSON", html: "HTML", xml: "XML",
      png: "PNG 图片", jpg: "JPEG 图片", jpeg: "JPEG 图片", gif: "GIF 图片", webp: "WebP 图片", svg: "SVG 图片",
      mp3: "MP3 音频", wav: "WAV 音频", mp4: "MP4 视频",
      zip: "ZIP 压缩包", rar: "RAR 压缩包", gz: "GZ 压缩包",
    }
    if (ext && extMap[ext]) return extMap[ext]
  }
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "图片"
    if (mimeType.startsWith("audio/")) return "音频"
    if (mimeType.startsWith("video/")) return "视频"
    if (mimeType.includes("pdf")) return "PDF"
    if (mimeType.includes("markdown") || mimeType.includes("x-markdown")) return "Markdown"
    return mimeType.split("/").pop()?.toUpperCase() || mimeType
  }
  return "文件"
}
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
    pptx: "text-orange-500", ppt: "text-orange-500",
    xlsx: "text-emerald-600", xls: "text-emerald-600",
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

function DrawerTagSection({ fileId, drawerTags, setDrawerTags }: { fileId: string; drawerTags: any[]; setDrawerTags: (tags: any[]) => void }) {
  const { data: allTags = [] } = useTags()
  const addTag = useAddTagToFile()
  const removeTag = useRemoveTagFromFile()
  const [showPicker, setShowPicker] = useState(false)
  const tagIds = new Set(drawerTags.map((t: any) => t.id))
  const availableTags = allTags.filter((t: any) => !tagIds.has(t.id))

  const handleAdd = async (tag: any) => {
    await addTag.mutateAsync({ fileId, tagId: tag.id })
    setDrawerTags([...drawerTags, tag])
    setShowPicker(false)
  }

  const handleRemove = async (tagId: string) => {
    await removeTag.mutateAsync({ fileId, tagId })
    setDrawerTags(drawerTags.filter((t: any) => t.id !== tagId))
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">🏷️ 标签</p>
      <div className="flex flex-wrap gap-1.5">
        {drawerTags.map((tag: any) => (
          <span key={tag.id} className="group inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: (tag.color || '#4F5BD5') + '20', color: tag.color || '#4F5BD5' }}>
            {tag.name}
            <button onClick={() => handleRemove(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 ml-0.5" title="移除标签">×</button>
          </span>
        ))}
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <PopoverTrigger asChild>
            <button className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent transition">+ 添加</button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {availableTags.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">没有更多标签</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-auto">
                {availableTags.map((tag: any) => (
                  <button key={tag.id} onClick={() => handleAdd(tag)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color || '#4F5BD5' }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}


function getDrawerFileType(name: string, mimeType?: string): string {
  const ext = name?.split(".").pop()?.toLowerCase() || ""
  if (ext === "md" || ext === "markdown") return "md"
  if (ext === "txt") return "txt"
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image"
  if (mimeType?.startsWith("image/")) return "image"
  return "other"
}

function DrawerInlinePreview({ fileId, fileName, mimeType }: { fileId: string; fileName: string; mimeType?: string }) {
  const fileType = getDrawerFileType(fileName, mimeType)
  const [content, setContent] = useState<string | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (fileType === "other") return
    let cancelled = false
    setLoading(true)
    setError(false)
    setContent(null)
    setImgUrl(null)

    ;(async () => {
      try {
        const res = await apiFetch(`/api/files/${fileId}/preview-url`) as { previewUrl: string }
        if (cancelled) return
        if (fileType === "image") {
          setImgUrl(res.previewUrl)
        } else {
          const textRes = await fetch(res.previewUrl)
          if (!textRes.ok) throw new Error("fetch failed")
          const text = await textRes.text()
          if (!cancelled) setContent(text.length > 5000 ? text.slice(0, 5000) + "\n\n…（内容过长，请点击完整预览查看）" : text)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fileId, fileType])

  if (fileType === "other") {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground space-y-3">
        <p>暂不支持预览，请下载查看</p>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              const res = await apiFetch(`/api/files/${fileId}/preview-url`) as { previewUrl: string }
              if (res.previewUrl) {
                const a = document.createElement("a")
                a.href = res.previewUrl
                a.download = fileName
                a.target = "_blank"
                a.click()
              }
            } catch {
              toast.error("获取下载链接失败")
            }
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />下载文件
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        预览加载失败
      </div>
    )
  }

  if (fileType === "image" && imgUrl) {
    return (
      <div className="rounded-lg border bg-muted/30 p-2 flex items-center justify-center">
        <img src={imgUrl} alt={fileName} className="max-h-[240px] max-w-full object-contain rounded" />
      </div>
    )
  }

  if ((fileType === "md" || fileType === "txt") && content !== null) {
    return (
      <div className="rounded-lg border bg-background p-3 max-h-[300px] overflow-auto">
        {fileType === "md" ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed">{content}</pre>
        )}
      </div>
    )
  }

  return null
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
  const { currentFolderId, setCurrentFolder, openInspector, selectedFileId, activeTagFilter, setActiveTagFilter, drawerFileId, openDrawer, closeDrawer } = useLayoutStore()
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
  const [userTags, setUserTags] = useState<any[]>([])
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [drawerTags, setDrawerTags] = useState<any[]>([])
  const [versionFileId, setVersionFileId] = useState<string | null>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [shareLoading, setShareLoading] = useState(false)
  const [tagManagerFileId, setTagManagerFileId] = useState<string | null>(null)
  const [tagManagerFileIds, setTagManagerFileIds] = useState<string[]>([])
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch("/api/tags").then((data: any) => setUserTags(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const handleShare = useCallback(async (fileId: string) => {
    setShareLoading(true)
    setShareDialogOpen(true)
    try {
      const data = await apiFetch(`/api/files/${fileId}/share`, { method: "POST" })
      setShareUrl(data.url || "")
    } catch (err) {
      console.error("Share failed:", err)
      toast.error("分享失败，请重试")
      setShareDialogOpen(false)
    } finally {
      setShareLoading(false)
    }
  }, [])

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

  const handleBatchArchive = useCallback(async () => {
    try {
      await apiFetch("/api/v1/files/batch", {
        method: "POST",
        body: JSON.stringify({ action: "archive", fileIds: Array.from(selected) }),
      })
      toast.success(`已归档 ${selected.size} 个文件`)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ["files"] })
    } catch { toast.error("归档失败") }
  }, [selected])

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
      if (sortKey === "type") return (a.type || "").localeCompare(b.type || "") * m
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * m
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

  const typeFiltered = typeFilter === "all" ? files : files.filter((f: any) => {
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

  const filteredFiles = activeTagFilter
    ? typeFiltered.filter((f: any) => f.tags?.some((t: any) => t.name === activeTagFilter))
    : typeFiltered

  const virt = useVirtualizer({ count: filteredFiles.length, getScrollElement: () => parentRef.current, estimateSize: () => 52, overscan: 5 })

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc") } }

  // Fetch tags for drawer file
  useEffect(() => {
    if (drawerFileId) {
      apiFetch(`/api/tags/file/${drawerFileId}`).then((data: any) => {
        setDrawerTags(Array.isArray(data) ? data : data?.tags || [])
      }).catch(() => setDrawerTags([]))
    } else {
      setDrawerTags([])
    }
  }, [drawerFileId])

  // F2 rename shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && selectedFileId) {
        e.preventDefault()
        const file = rawFiles?.find((f: any) => f.id === selectedFileId)
        if (file) {
          const dotIdx = file.name.lastIndexOf(".")
          setRenameTarget({ fileId: file.id, currentName: file.name })
          setRenameValue(dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedFileId, rawFiles])

  // Keyboard navigation: arrows, enter, delete, escape
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      // Skip when typing in inputs
      const tag = (document.activeElement?.tagName || "").toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return
      if ((document.activeElement as HTMLElement)?.isContentEditable) return
      if (!filteredFiles?.length) return

      const currentIdx = filteredFiles.findIndex((f: any) => f.id === selectedFileId)

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, filteredFiles.length - 1)
        openInspector(filteredFiles[nextIdx].id)
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        const prevIdx = currentIdx < 0 ? 0 : Math.max(currentIdx - 1, 0)
        openInspector(filteredFiles[prevIdx].id)
      }
      if (e.key === "Enter" && selectedFileId) {
        e.preventDefault()
        router.push(`/files/${selectedFileId}/preview`)
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedFileId) {
        e.preventDefault()
        setDeleteTarget(selectedFileId)
      }
      if (e.key === "Escape") {
        e.preventDefault()
        openInspector("")
      }
    }
    window.addEventListener("keydown", handleKeyNav)
    return () => window.removeEventListener("keydown", handleKeyNav)
  }, [filteredFiles, selectedFileId, router, openInspector])

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
        className="flex flex-col items-center justify-center h-full"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setShowUpload(true) }}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-xl font-semibold mb-2">开始你的 AI 知识库</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-8">
            上传文件，AI 自动理解内容。随时提问，AI 用你的知识回答。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-xl border p-4 hover:border-[#4F5BD5]/50 hover:shadow-md transition text-center"
            >
              <div className="rounded-lg bg-[#4F5BD5]/10 p-3 mx-auto w-fit mb-2">
                <Upload className="h-5 w-5 text-[#4F5BD5]" />
              </div>
              <p className="text-sm font-medium">上传文件</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF、Word、PPT 等</p>
            </button>
            <Link
              href="/chat"
              className="rounded-xl border p-4 hover:border-green-500/50 hover:shadow-md transition text-center"
            >
              <div className="rounded-lg bg-green-500/10 p-3 mx-auto w-fit mb-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-sm font-medium">问 AI 问题</p>
              <p className="text-xs text-muted-foreground mt-0.5">基于你的知识库</p>
            </Link>
            <Link
              href="/chat?q=帮我看看示例文件里有什么"
              className="rounded-xl border p-4 hover:border-amber-500/50 hover:shadow-md transition text-center"
            >
              <div className="rounded-lg bg-amber-500/10 p-3 mx-auto w-fit mb-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm font-medium">体验示例</p>
              <p className="text-xs text-muted-foreground mt-0.5">用 demo 文件试试</p>
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            支持 PDF、Word、PPT、Excel、TXT、Markdown 等格式
          </p>
        </div>
        {showUpload && <FileUpload onClose={() => setShowUpload(false)} folderId={currentFolderId} />}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" onDragOver={(e) => { e.preventDefault() }} onDrop={(e) => { e.preventDefault(); setShowUpload(true) }}>
      {/* Toolbar: filters left, actions right */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
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
                  ? "bg-[#4F5BD5] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {label}
            </button>
          ))}
          {userTags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition">
                  <Tag className="h-3 w-3" />
                  {activeTagFilter || "标签"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                {userTags.map((tag: any) => (
                  <button key={tag.id} onClick={() => setActiveTagFilter(activeTagFilter === tag.name ? null : tag.name)}
                    className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#6B7280' }} />
                    <span className={activeTagFilter === tag.name ? "font-medium" : ""}>{tag.name}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
          <Button size="sm" onClick={() => { setNewFolderName(""); setFolderDialogOpen(true) }} variant="outline" className="gap-1"><FolderPlus className="h-3.5 w-3.5" />新建文件夹</Button>
          <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1 bg-[#4F5BD5] hover:bg-[#3D49C4] text-white"><Upload className="h-3.5 w-3.5" />让 AI 记住</Button>
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
            <div key={folder.id} className={cn("rounded-xl border p-4 hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-2", dragOverFolderId === folder.id && "ring-2 ring-[#4F5BD5] bg-[#4F5BD5]/5")} onClick={() => setCurrentFolder(folder.id)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId(folder.id) }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={async (e) => { e.preventDefault(); setDragOverFolderId(null); const fileId = e.dataTransfer.getData("text/plain"); if (fileId) { moveFile.mutate({ fileId, folderId: folder.id }); toast.success("已移入 " + folder.name) } }}>
              <div className="flex h-28 items-center justify-center rounded-lg bg-muted/50">
                <Folder className="h-14 w-14 text-amber-500" />
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
            <div key={folder.id} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors", dragOverFolderId === folder.id && "ring-2 ring-[#4F5BD5] bg-[#4F5BD5]/5")} onClick={() => setCurrentFolder(folder.id)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId(folder.id) }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={async (e) => { e.preventDefault(); setDragOverFolderId(null); const fileId = e.dataTransfer.getData("text/plain"); if (fileId) { moveFile.mutate({ fileId, folderId: folder.id }); toast.success("已移入 " + folder.name) } }}>
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
              <HoverCard openDelay={400} closeDelay={100} key={file.id}>
              <HoverCardTrigger asChild>
              <div onClick={(e) => handleClick(file.id, e)} onDoubleClick={() => router.push(`/files/${file.id}/preview`)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY }) }}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", file.id); e.dataTransfer.effectAllowed = "move" }}
                className={cn("group absolute left-0 top-0 flex w-full cursor-pointer items-center gap-3 border-b border-border/50 px-4 py-3 hover:bg-accent/50 transition-colors", isSel && "bg-accent")}
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
                <span className="truncate text-sm flex-1 min-w-0" title={file.name}>{file.name}</span>
                {file.previousVersionId && <span className="shrink-0 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-500">已更新</span>}
                {file.archivedAt && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">已归档</span>}
                {file.tags?.slice(0, 2).map((tag: any) => (
                  <span key={tag.name} className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: (tag.color || '#4F5BD5') + '20', color: tag.color || '#4F5BD5' }}>{tag.name}</span>
                ))}
                {file.suggestedFolder && !file.folderId && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="shrink-0 text-[#4F5BD5] hover:text-[#3D49C4] transition-colors" onClick={(e) => {
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
                <span className="w-20 text-right text-xs text-muted-foreground shrink-0 hidden sm:inline" suppressHydrationWarning>{formatRelativeTime(file.updatedAt || file.createdAt)}</span>
                <span className="w-16 text-right text-xs text-muted-foreground shrink-0 hidden sm:inline">{fmtSize(file.size)}</span>
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(file.id, e) }}
                    className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center"
                    title="下载"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(file.id) }}
                    className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center"
                    title="分享"
                  >
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDrawer(file.id) }}
                    className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center"
                    title="文件详情"
                  >
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY }) }}
                    className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center"
                    title="更多"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              </HoverCardTrigger>
              {file.summary && (
                <HoverCardContent side="right" className="w-80">
                  <p className="text-xs text-muted-foreground line-clamp-4">{file.summary}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground/70">
                    <span>{fmtSize(file.size)}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(file.createdAt)}</span>
                  </div>
                </HoverCardContent>
              )}
              </HoverCard>
            )
          })}
        </div>
      </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 p-5">
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
                  className={cn("rounded-xl border p-4 hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-3 overflow-hidden min-w-0", isSel && "bg-accent ring-2 ring-primary")}
                >
                  <div className="flex h-28 items-center justify-center rounded-lg bg-muted/50">
                    <TypeIcon type={file.type} name={file.name} className="h-14 w-14" />
                  </div>
                  <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                  {file.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{file.summary}</p>
                  )}
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.tags.slice(0, 2).map((tag: any) => (
                        <span key={tag.name} className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: (tag.color || '#4F5BD5') + '20', color: tag.color || '#4F5BD5' }}>{tag.name}</span>
                      ))}
                    </div>
                  )}
                  {file.suggestedFolder && !file.folderId && (
                    <span className="text-xs text-indigo-500">💡 {file.suggestedFolder}</span>
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
              setTagManagerFileId(contextMenu.fileId)
              setContextMenu(null)
            }}>
              🏷️ 管理标签
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              handleShare(contextMenu.fileId)
              setContextMenu(null)
            }}>
              <Share2 className="h-4 w-4 mr-2" />分享
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              const file = rawFiles?.find((f: any) => f.id === contextMenu?.fileId)
              const isArchived = file?.archivedAt
              try {
                await apiFetch(`/api/files/${contextMenu?.fileId}/${isArchived ? 'unarchive' : 'archive'}`, { method: 'PATCH' })
                queryClient.invalidateQueries({ queryKey: ['files'] })
                toast.success(isArchived ? '已取消归档' : '已归档')
              } catch { toast.error('操作失败') }
              setContextMenu(null)
            }}>
              📦 {rawFiles?.find((f: any) => f.id === contextMenu?.fileId)?.archivedAt ? '取消归档' : '归档'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const file = rawFiles?.find((f: any) => f.id === contextMenu?.fileId)
              if (file) {
                // Find versions: files with same name base or linked via previousVersionId
                const allVersions = rawFiles?.filter((f: any) =>
                  f.id === file.id || f.previousVersionId === file.id || file.previousVersionId === f.id ||
                  (f.name.replace(/_\d{8}/, '') === file.name.replace(/_\d{8}/, '') && f.id !== file.id)
                ) || []
                setVersions(allVersions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
                setVersionFileId(file.id)
              }
              setContextMenu(null)
            }}>
              📋 版本历史
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              router.push(`/chat?fileIds=${contextMenu.fileId}`)
              setContextMenu(null)
            }}>
              <BotMessageSquare className="h-4 w-4 mr-2" />💬 问 AI 关于这个文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              router.push(`/files/${contextMenu.fileId}/preview`)
              setContextMenu(null)
            }}>
              <Link2 className="h-4 w-4 mr-2" />🔗 查看知识关联
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-background border shadow-lg px-4 py-3 z-50">
          <span className="text-sm font-medium">已选 {selected.size} 个文件</span>
          <Button variant="outline" size="sm" onClick={handleBatchDelete}>删除</Button>
          <Button variant="outline" size="sm" onClick={handleBatchArchive}>归档</Button>
          <Button variant="outline" size="sm" onClick={() => setBatchMoveOpen(true)}>移动</Button>
          <Button variant="outline" size="sm" onClick={handleBatchDownload}>下载</Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (selected.size > 0) {
              setTagManagerFileIds(Array.from(selected))
              setTagManagerFileId("__batch__")
            }
          }}>标签</Button>
          <button
            onClick={() => {
              const ids = Array.from(selected).join(",")
              router.push(`/chat?fileIds=${ids}`)
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#4F5BD5]/30 px-3 py-1.5 text-xs text-[#4F5BD5] hover:bg-[#4F5BD5]/10"
          >
            💬 问 AI
          </button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>取消</Button>
        </div>
      )}
      <FirstUploadGuide hasIndexedFile={files.some((f: any) => f.status === "indexed")} />
      {filteredFiles.length < 5 && filteredFiles.length > 0 && (
        <div className="border-t border-border/50 px-6 py-6">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">快速上手</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#4F5BD5]/30 bg-[#4F5BD5]/5 p-4 hover:border-[#4F5BD5]/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4F5BD5]/10">
                <Upload className="h-4.5 w-4.5 text-[#4F5BD5]" />
              </div>
              <span className="text-xs font-medium">上传更多文件</span>
              <span className="text-[11px] text-muted-foreground leading-tight">PDF、Word、笔记等</span>
            </button>
            <Link
              href="/chat?new=1"
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-green-500/30 bg-green-500/5 p-4 hover:border-green-500/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <MessageSquare className="h-4.5 w-4.5 text-green-500" />
              </div>
              <span className="text-xs font-medium">试试 AI 对话</span>
              <span className="text-[11px] text-muted-foreground leading-tight">基于你的知识库提问</span>
            </Link>
            <a
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <span className="text-xs font-medium">安装 Web Clipper</span>
              <span className="text-[11px] text-muted-foreground leading-tight">一键保存网页内容</span>
            </a>
            <Link
              href="/developers"
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-purple-500/30 bg-purple-500/5 p-4 hover:border-purple-500/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <FileText className="h-4.5 w-4.5 text-purple-500" />
              </div>
              <span className="text-xs font-medium">查看开发者文档</span>
              <span className="text-[11px] text-muted-foreground leading-tight">API 集成与自动化</span>
            </Link>
          </div>
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
              <Input value={shareUrl} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>关闭</Button>
                <Button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("已复制") }}>复制</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* File Detail Drawer Backdrop */}
      {drawerFileId && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => closeDrawer()} />
      )}
      {/* File Detail Drawer */}
      {(() => {
        const drawerFile = rawFiles?.find((f: any) => f.id === drawerFileId)
        if (!drawerFile) return null
        return (
          <div className="fixed inset-y-0 right-0 z-50 w-[400px] border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">文件详情</h3>
              <button onClick={() => closeDrawer()} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-auto p-4 space-y-4" style={{ height: "calc(100vh - 56px)" }}>
              <div className="flex justify-center py-4">
                <TypeIcon type={drawerFile.type} name={drawerFile.name} className="h-16 w-16" />
              </div>
              <h2 className="text-lg font-semibold text-center truncate" title={drawerFile.name}>{drawerFile.name}</h2>
              {drawerFile.summary && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">🧠 AI 摘要</p>
                  <p className="text-sm">{drawerFile.summary}</p>
                </div>
              )}
              {/* Tags management */}
              <DrawerTagSection fileId={drawerFile.id} drawerTags={drawerTags} setDrawerTags={setDrawerTags} />
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">📋 文件信息</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">大小</span>
                  <span>{fmtSize(drawerFile.size)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">类型</span>
                  <span>{formatFileType(drawerFile.mimeType, drawerFile.name)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">上传时间</span>
                  <span>{new Date(drawerFile.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">状态</span>
                  <span>{drawerFile.status === "indexed" ? "✅ 已索引" : drawerFile.status}</span>
                </div>
              </div>
              <Link
                href={`/chat?fileIds=${drawerFile.id}`}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#4F5BD5] hover:bg-[#3D49C4] text-white py-2.5 text-sm transition"
              >
                💬 问 AI 关于这个文件
              </Link>
              {/* Inline Preview */}
              <DrawerInlinePreview fileId={drawerFile.id} fileName={drawerFile.name} mimeType={drawerFile.mimeType} />
              <Link
                href={`/files/${drawerFile.id}/preview`}
                className="flex items-center justify-center gap-2 w-full rounded-lg border hover:bg-accent py-2.5 text-sm transition"
              >
                👁️ 查看完整预览
              </Link>
            </div>
          </div>
        )
      })()}

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

      {/* Version History Dialog */}
      <Dialog open={!!versionFileId} onOpenChange={() => setVersionFileId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>📋 版本历史</DialogTitle></DialogHeader>
          {versions.length <= 1 ? (
            <p className="text-sm text-muted-foreground text-center py-4">没有其他版本</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {versions.map((v: any) => (
                <div key={v.id} className={cn("flex items-center justify-between rounded-lg border p-3", v.id === versionFileId && "border-[#4F5BD5] bg-[#4F5BD5]/5")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString("zh-CN")} · {fmtSize(v.size)}</p>
                  </div>
                  <Link href={`/files/${v.id}/preview`} className="text-xs text-[#4F5BD5] hover:underline shrink-0 ml-2">预览</Link>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tag Manager Dialog */}
      <TagManagerDialog
        fileId={tagManagerFileId === "__batch__" ? null : tagManagerFileId}
        fileIds={tagManagerFileId === "__batch__" ? tagManagerFileIds : undefined}
        fileName={tagManagerFileId && tagManagerFileId !== "__batch__" ? rawFiles?.find((f: any) => f.id === tagManagerFileId)?.name : undefined}
        open={!!tagManagerFileId}
        onOpenChange={(open) => { if (!open) { setTagManagerFileId(null); setTagManagerFileIds([]) } }}
      />
    </div>
  )
}
