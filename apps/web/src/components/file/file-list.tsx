"use client"
import { KnowledgeFeedback } from "@/components/feedback/knowledge-feedback"

import { useState, useMemo, useCallback, useRef, useEffect, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FileText, Loader2, CheckCircle2, XCircle, ArrowUpDown, Upload, AlertCircle, FolderPlus, Folder, ChevronRight, MessageSquare, LayoutGrid, List, Download, Share2, MoreHorizontal, BotMessageSquare, Link2, Info, X, Sparkles } from "lucide-react"
import { Lightbulb, Tag, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { cleanSummary } from "@/lib/text-utils"

function displayFileName(name: string, summary?: string | null, disambiguator?: string): string {
  const bare = name.replace(/\.md$/i, "")
  let label = bare
  if (/^note-\d{4}-\d{2}-\d{2}T[\d-]+$/.test(bare)) label = "AI Note"
  else if (/^session-summary-[\w-]+$/.test(bare)) label = "Session Summary"
  else if (/^auto-capture-[\w-]+$/.test(bare)) label = "Auto Capture"
  else if (/^auto-[\w-]+$/.test(bare)) label = "Auto Note"
  else if (/^\d{4}-\d{2}-\d{2}$/.test(bare) && summary) {
    const cleaned = cleanSummary(summary)
    const firstSentence = cleaned.split(/[.。!！?\n]/)[0].trim()
    label = firstSentence.slice(0, 80) || bare
  }
  if (disambiguator) label = `${label} (${disambiguator})`
  return label
}

function SourceBadge({ source }: { source?: string | null }) {
  let emoji: string, label: string, colorClass: string
  switch (source) {
    case 'harvest':
    case 'auto-note':
      emoji = '🤖'; label = 'Agent'; colorClass = 'bg-emerald-50 text-emerald-700'; break
    case 'chat-store':
      emoji = '💡'; label = 'Insight'; colorClass = 'bg-purple-50 text-purple-700'; break
    case 'connector':
      emoji = '🔗'; label = 'Sync'; colorClass = 'bg-blue-50 text-blue-700'; break
    default:
      emoji = '📄'; label = 'File'; colorClass = 'bg-zinc-100 text-zinc-600'; break
  }
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>
      {emoji} {label}
    </span>
  )
}

const SYSTEM_TAGS = new Set(['test', 'report', 'auto-generated', 'ai-note', 'session-summary', 'imported', 'mcp-stored', 'conversation', 'knowledge'])
function isSystemTag(tag: { isSystem?: boolean; name: string }): boolean {
  return tag.isSystem === true || SYSTEM_TAGS.has(tag.name.toLowerCase())
}

function fileSubtitle(name: string, summary?: string | null, createdAt?: string): string | null {
  if (summary) {
    const cleaned = cleanSummary(summary)
    return cleaned.slice(0, 60) + (cleaned.length > 60 ? '…' : '')
  }
  const bare = name.replace(/\.md$/i, "")
  const isGenerated = /^note-\d{4}-\d{2}-\d{2}T[\d-]+$/.test(bare)
    || /^session-summary-[\w-]+$/.test(bare)
    || /^auto-capture-[\w-]+$/.test(bare)
    || /^auto-[\w-]+$/.test(bare)
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(bare)
  if ((isGenerated || isDateOnly) && createdAt) {
    return new Date(createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }
  return null
}

function buildDisambiguators(files: FileItem[]): Map<string, string> {
  const nameGroups = new Map<string, FileItem[]>()
  for (const f of files) {
    const dn = displayFileName(f.name, f.summary)
    const arr = nameGroups.get(dn) || []
    arr.push(f)
    nameGroups.set(dn, arr)
  }
  const result = new Map<string, string>()
  for (const [, group] of nameGroups) {
    if (group.length <= 1) continue
    const sorted = [...group].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    for (const f of sorted) {
      const d = new Date(f.createdAt)
      result.set(f.id, d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }))
    }
  }
  return result
}

function CollapsibleSystemTags({ tags }: { tags: { name: string; color?: string }[] }) {
  const [expanded, setExpanded] = useState(false)
  if (tags.length === 0) return null
  if (expanded) {
    return (
      <>
        {tags.map((tag) => (
          <span key={tag.name} className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 bg-transparent italic">{tag.name}</span>
        ))}
        <button onClick={(e) => { e.stopPropagation(); setExpanded(false) }} className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition">hide</button>
      </>
    )
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); setExpanded(true) }} className="shrink-0 rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 italic transition">
      +{tags.length} system {tags.length === 1 ? 'tag' : 'tags'}
    </button>
  )
}
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
import { NetworkError, classifyError } from "@/components/ui/network-error"
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
  source?: string | null
}

function fmtSize(b: number) { return !b ? "—" : b < 1024 ? "< 1 KB" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB" }

function formatFileType(mimeType?: string, name?: string): string {
  if (name) {
    const ext = name.split(".").pop()?.toLowerCase()
    const extMap: Record<string, string> = {
      md: "Markdown", markdown: "Markdown", txt: "Plain text", pdf: "PDF",
      doc: "Word", docx: "Word", xls: "Excel", xlsx: "Excel",
      ppt: "PowerPoint", pptx: "PowerPoint", csv: "CSV",
      json: "JSON", html: "HTML", xml: "XML",
      png: "PNG Image", jpg: "JPEG Image", jpeg: "JPEG Image", gif: "GIF Image", webp: "WebP Image", svg: "SVG Image",
      mp3: "MP3 Audio", wav: "WAV Audio", mp4: "MP4 Video",
      zip: "ZIP archive", rar: "RAR archive", gz: "GZ archive",
    }
    if (ext && extMap[ext]) return extMap[ext]
  }
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "Image"
    if (mimeType.startsWith("audio/")) return "Audio"
    if (mimeType.startsWith("video/")) return "Video"
    if (mimeType.includes("pdf")) return "PDF"
    if (mimeType.includes("markdown") || mimeType.includes("x-markdown")) return "Markdown"
    return mimeType.split("/").pop()?.toUpperCase() || mimeType
  }
  return "Files"
}
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }

function formatRelativeTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`
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
  const color = (ext && colorByExt[ext]) || colorByType[type] || "text-zinc-500 dark:text-zinc-400"
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
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">🏷️ Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {drawerTags.map((tag: any) => (
          <span key={tag.id} className="group inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: (tag.color || '#4F5BD5') + '20', color: tag.color || '#4F5BD5' }}>
            {tag.name}
            <button onClick={() => handleRemove(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 ml-0.5" title="Remove tag">×</button>
          </span>
        ))}
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <PopoverTrigger asChild>
            <button className="rounded-full border border-dashed px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">+ Add</button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {availableTags.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-2">No more tags</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-auto">
                {availableTags.map((tag: any) => (
                  <button key={tag.id} onClick={() => handleAdd(tag)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
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
  // Fallback: check mimeType for text-based files without recognized extension
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") return "md"
  if (mimeType === "text/plain" || mimeType?.startsWith("text/")) return "txt"
  // Auto-notes and harvested files are always markdown-compatible
  if (name?.endsWith(".md")) return "md"
  return "other"
}

function DrawerInlinePreview({ fileId, fileName, mimeType }: { fileId: string; fileName: string; mimeType?: string }) {
  const fileType = getDrawerFileType(fileName, mimeType)
  const [content, setContent] = useState<string | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
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
          if (!cancelled) setContent(text.length > 50000 ? text.slice(0, 50000) + "\n\n…（Content is too long. Click full preview to view the rest)" : text)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fileId, fileType])

  if (fileType === "other" && !content && !loading) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-zinc-500 dark:text-zinc-400 space-y-3">
        <p>Preview not supported, please download to view</p>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              const res = await apiFetch(`/api/files/${fileId}/preview-url`) as any
              if (res.content) {
                // Store-created note — download text content
                const blob = new Blob([res.content], { type: "text/markdown" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = fileName
                a.click()
                URL.revokeObjectURL(url)
              } else if (res.previewUrl) {
                // Uploaded file — fetch blob to force download
                const blob = await fetch(res.previewUrl).then(r => r.blob())
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = fileName
                a.click()
                URL.revokeObjectURL(url)
              }
            } catch {
              toast.error("Failed to get download link")
            }
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />Download file
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border bg-zinc-50/30 dark:bg-zinc-800/30">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500 dark:text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-zinc-500 dark:text-zinc-400">
        Preview failed to load
      </div>
    )
  }

  if (fileType === "image" && imgUrl) {
    return (
      <div className="rounded-lg border bg-zinc-50/30 dark:bg-zinc-800/30 p-2 flex items-center justify-center">
        <img src={imgUrl} alt={fileName} className="max-h-[240px] max-w-full object-contain rounded" />
      </div>
    )
  }

  if ((fileType === "md" || fileType === "txt" || fileType === "other") && content !== null) {
    return (
      <div className="rounded-lg border bg-background p-3 overflow-auto">
        {fileType === "md" ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
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

function getFailureInfo(error?: string): { label: string; tooltip: string; isEncrypted: boolean } {
  if (error && /password.protected|encrypted/i.test(error)) {
    return { label: "Password protected", tooltip: "This file is password-protected. Please remove the password and re-upload.", isEncrypted: true }
  }
  if (error && /too.large|size.limit/i.test(error)) {
    return { label: "File too large", tooltip: "This file exceeds the size limit. Try splitting it into smaller files.", isEncrypted: false }
  }
  if (error && /unsupported|format/i.test(error)) {
    return { label: "Unsupported format", tooltip: "This file format is not supported. Try converting to PDF, TXT, or Markdown.", isEncrypted: false }
  }
  return { label: "Indexing failed", tooltip: error || "Failed to process this file. Try re-uploading or converting to a different format.", isEncrypted: false }
}

function StatusIcon({ status, error, compact }: { status: string; error?: string; compact?: boolean }) {
  if (status === "uploading") return <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500 dark:text-zinc-400" />
  if (status === "parsing") {
    if (compact) return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
    return <span className="flex items-center gap-1 text-xs text-yellow-500"><Loader2 className="h-3 w-3 animate-spin" />AI Remembering...</span>
  }
  if (status === "indexed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
  const info = getFailureInfo(error)
  if (compact) return <span title={info.tooltip} className="cursor-help"><XCircle className="h-3.5 w-3.5 text-red-500" /></span>
  return (
    <span title={info.tooltip} className="flex items-center gap-1 text-xs text-red-500 cursor-help">
      <XCircle className="h-3.5 w-3.5" />{info.label}
    </span>
  )
}

export function FileList() {
  const { currentFolderId, setCurrentFolder, openInspector, selectedFileId, activeTagFilter, setActiveTagFilter, activeSourceFilter, drawerFileId, openDrawer, closeDrawer } = useLayoutStore()
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
  const [showAllTags, setShowAllTags] = useState(false)
  const [tagSearch, setTagSearch] = useState("")
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "documents" | "notes" | "connectors">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearch = useDeferredValue(searchQuery)
  const [pageSort, setPageSort] = useState<"recent" | "name-asc" | "name-desc">("recent")
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
  const [staleFileIds, setStaleFileIds] = useState<Set<string>>(new Set())

  // Fetch stale file IDs for inline ⚠️ indicators
  useEffect(() => {
    apiFetch("/api/files/stale", { silent: true })
      .then((data: any) => {
        const ids = new Set<string>()
        const dismissed = JSON.parse(localStorage.getItem('dismissedOutdatedFiles') || '{}')
        const now = Date.now()
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
        for (const f of (data?.staleFiles || [])) {
          const dismissedAt = dismissed[f.fileId]
          if (dismissedAt && (now - new Date(dismissedAt).getTime()) < THIRTY_DAYS) continue
          ids.add(f.fileId)
        }
        setStaleFileIds(ids)
      })
      .catch(() => {})
  }, [])

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
      toast.error("Share failed, please try again")
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
      await apiFetch("/api/files/batch", {
        method: "POST",
        body: JSON.stringify({ action: "archive", fileIds: Array.from(selected) }),
      })
      toast.success(`Archived ${selected.size} files`)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ["files"] })
    } catch { toast.error("Archive failed") }
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
    { key: "all", label: "All" },
    { key: "pdf", label: "PDF" },
    { key: "word", label: "Word" },
    { key: "ppt", label: "PPT" },
    { key: "excel", label: "Excel" },
    { key: "md", label: "Markdown" },
    { key: "txt", label: "Text" },
    { key: "image", label: "Image" },
  ]

  // Category classification helpers
  const isNote = useCallback((f: FileItem) => {
    const bare = f.name.replace(/\.md$/i, "")
    return /^note-\d{4}-\d{2}-\d{2}T[\d-]+$/.test(bare)
      || /^session-summary-[\w-]+$/.test(bare)
      || /^auto-capture-[\w-]+$/.test(bare)
      || /^auto-[\w-]+$/.test(bare)
      || f.tags?.some((t: any) => ["ai-note", "session-summary"].includes(t.name.toLowerCase()))
  }, [])

  const isConnector = useCallback((f: FileItem) => {
    return f.tags?.some((t: any) => ["mcp-stored", "imported", "connector"].includes(t.name.toLowerCase()))
  }, [])

  // Search filter (name + summary)
  const searchFiltered = useMemo(() => {
    if (!deferredSearch.trim()) return files
    const q = deferredSearch.toLowerCase()
    return files.filter((f) => {
      const name = (f.name || "").toLowerCase()
      const summary = (f.summary || "").toLowerCase()
      return name.includes(q) || summary.includes(q)
    })
  }, [files, deferredSearch])

  // Category filter
  const categoryFiltered = useMemo(() => {
    if (categoryFilter === "all") return searchFiltered
    return searchFiltered.filter((f) => {
      switch (categoryFilter) {
        case "notes": return isNote(f)
        case "connectors": return isConnector(f)
        case "documents": return !isNote(f) && !isConnector(f)
        default: return true
      }
    })
  }, [searchFiltered, categoryFilter, isNote, isConnector])

  const typeFiltered = typeFilter === "all" ? categoryFiltered : categoryFiltered.filter((f: any) => {
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

  const tagFiltered = activeTagFilter
    ? typeFiltered.filter((f: any) => f.tags?.some((t: any) => t.name === activeTagFilter))
    : typeFiltered

  const filteredFiles = activeSourceFilter
    ? tagFiltered.filter((f: any) => {
        const s = f.source || 'upload'
        switch (activeSourceFilter) {
          case 'files': return s === 'upload' || s === 'sample'
          case 'agent': return s === 'harvest' || s === 'auto-note'
          case 'insights': return s === 'chat-store'
          case 'synced': return s === 'connector'
          default: return true
        }
      })
    : tagFiltered

  const disambiguators = useMemo(() => buildDisambiguators(filteredFiles), [filteredFiles])

  // Page-level sort override
  const sortedFilteredFiles = useMemo(() => {
    if (pageSort === "recent") return filteredFiles
    return [...filteredFiles].sort((a, b) => {
      if (pageSort === "name-asc") return a.name.localeCompare(b.name)
      if (pageSort === "name-desc") return b.name.localeCompare(a.name)
      return 0
    })
  }, [filteredFiles, pageSort])

  const searchMatchCount = deferredSearch.trim() ? sortedFilteredFiles.length : null

  const virt = useVirtualizer({ count: sortedFilteredFiles.length, getScrollElement: () => parentRef.current, estimateSize: () => 52, overscan: 5 })

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
      if (!sortedFilteredFiles?.length) return

      const currentIdx = sortedFilteredFiles.findIndex((f: any) => f.id === selectedFileId)

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, sortedFilteredFiles.length - 1)
        openInspector(sortedFilteredFiles[nextIdx].id)
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        const prevIdx = currentIdx < 0 ? 0 : Math.max(currentIdx - 1, 0)
        openInspector(sortedFilteredFiles[prevIdx].id)
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
  }, [sortedFilteredFiles, selectedFileId, router, openInspector])

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
      <NetworkError
        mode="fullpage"
        type={classifyError(error)}
        message={(error as Error).message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["files"] })}
      />
    )
  }

  if (files.length === 0 && !showUpload && !currentFolderId && visibleFolders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setShowUpload(true) }}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center max-w-xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 via-green-500/5 to-amber-500/10 p-1 mb-6">
            <div className="rounded-xl bg-background px-8 py-6">
              <Sparkles className="h-8 w-8 text-brand-500 mx-auto mb-3" />
              <h3 className="text-xl font-semibold mb-2">Start building your knowledge library</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Upload files or create notes. AI automatically understands content and builds connections. Ask anytime, AI answers using your knowledge.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <button
              onClick={() => setShowUpload(true)}
              className="group rounded-xl border p-4 hover:border-brand-500/50 hover:shadow-md transition-all text-center"
            >
              <div className="rounded-lg bg-brand-500/10 p-3 mx-auto w-fit mb-2 group-hover:scale-110 transition-transform">
                <Upload className="h-5 w-5 text-brand-500" />
              </div>
              <p className="text-sm font-medium">Upload files</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">PDF, Word, PPT etc.</p>
            </button>
            <button
              onClick={async () => {
                try {
                  await apiFetch("/api/files/store", {
                    method: "POST",
                    body: JSON.stringify({ content: "", title: "Untitled note" }),
                  })
                  queryClient.invalidateQueries({ queryKey: ["files"] })
                  toast.success("Note created")
                } catch { toast.error("Create note failed") }
              }}
              className="group rounded-xl border p-4 hover:border-purple-500/50 hover:shadow-md transition-all text-center"
            >
              <div className="rounded-lg bg-purple-500/10 p-3 mx-auto w-fit mb-2 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-sm font-medium">Create note</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Quick note</p>
            </button>
            <Link
              href="/chat"
              className="group rounded-xl border p-4 hover:border-green-500/50 hover:shadow-md transition-all text-center"
            >
              <div className="rounded-lg bg-green-500/10 p-3 mx-auto w-fit mb-2 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-sm font-medium">Ask AI</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Based on your knowledge library</p>
            </Link>
            <Link
              href="/chat?q=Help me see what's in the sample files"
              className="group rounded-xl border p-4 hover:border-amber-500/50 hover:shadow-md transition-all text-center"
            >
              <div className="rounded-lg bg-amber-500/10 p-3 mx-auto w-fit mb-2 group-hover:scale-110 transition-transform">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm font-medium">Try examples</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Try with demo files</p>
            </Link>
          </div>
          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            Drag & drop supported · PDF, Word, PPT, Excel, TXT, Markdown
          </p>
        </div>
        {showUpload && <FileUpload onClose={() => setShowUpload(false)} folderId={currentFolderId} />}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" onDragOver={(e) => { e.preventDefault() }} onDrop={(e) => { e.preventDefault(); setShowUpload(true) }}>
      {/* Search & Category bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-zinc-200 dark:border-zinc-700 px-4 py-2">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-16 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
          {searchMatchCount !== null && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {searchMatchCount} found
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {(["all", "documents", "notes", "connectors"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition capitalize whitespace-nowrap",
                categoryFilter === cat
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              )}
            >
              {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(["recent", "name-asc", "name-desc"] as const).map((s) => {
            const labels: Record<string, string> = { recent: "Recent", "name-asc": "A→Z", "name-desc": "Z→A" }
            return (
              <button
                key={s}
                onClick={() => setPageSort(s)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition whitespace-nowrap",
                  pageSort === s
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                )}
              >
                {labels[s]}
              </button>
            )
          })}
        </div>
      </div>
      {/* Toolbar: filters left, actions right */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-2 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          <Checkbox
            checked={sortedFilteredFiles.length > 0 && sortedFilteredFiles.every(f => selected.has(f.id))}
            onCheckedChange={(checked) => {
              if (checked) setSelected(new Set(sortedFilteredFiles.map(f => f.id)))
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
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-700"
              )}
            >
              {label}
            </button>
          ))}
          {userTags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                  <Tag className="h-3 w-3" />
                  {activeTagFilter || "Tags"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 max-h-64 overflow-y-auto" align="start">
                {showAllTags && userTags.length > 20 && (
                  <input
                    type="text"
                    placeholder="Search tags..."
                    className="w-full px-2 py-1.5 text-xs border-b border-zinc-100 dark:border-zinc-800 bg-transparent outline-none text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 mb-1"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                  />
                )}
                {(showAllTags ? (tagSearch ? userTags.filter((t: any) => t.name.toLowerCase().includes(tagSearch.toLowerCase())) : userTags) : userTags.slice(0, 10)).map((tag: any) => (
                  <button key={tag.id} onClick={() => setActiveTagFilter(activeTagFilter === tag.name ? null : tag.name)}
                    className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#6B7280' }} />
                    <span className={activeTagFilter === tag.name ? "font-medium" : ""}>{tag.name}</span>
                  </button>
                ))}
                {userTags.length > 10 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1.5 mt-1 border-t border-zinc-100 dark:border-zinc-800"
                  >
                    {showAllTags ? 'Show less' : `Show all (${userTags.length})`}
                  </button>
                )}
              </PopoverContent>
            </Popover>
          )}
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <ArrowUpDown className="h-3 w-3" />
                {{ name: "Name", createdAt: "Time", size: "Size", type: "Type" }[sortKey]}
                {sortDir === "asc" ? " ↑" : " ↓"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {([["createdAt", "By time"], ["name", "By name"], ["size", "By size"], ["type", "By type"]] as [SortKey, string][]).map(([k, label]) => (
                <DropdownMenuItem key={k} onClick={() => toggleSort(k)} className={sortKey === k ? "font-medium" : ""}>
                  {label} {sortKey === k && (sortDir === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Desktop: show all buttons inline */}
          <div className="hidden sm:flex items-center gap-1">
            <Button size="sm" onClick={async () => {
              try {
                toast.info("AI Organizing files...")
                const data = await apiFetch("/api/files/auto-organize", { method: "POST" })
                toast.success(data?.message || "Organization complete")
                queryClient.invalidateQueries({ queryKey: ["files"] })
                queryClient.invalidateQueries({ queryKey: ["folders"] })
              } catch (e: any) { toast.error(e.message || "Organization failed") }
            }} variant="outline" className="gap-1">
              ✨ One-click organize
            </Button>
            <Button size="sm" onClick={() => { setNewFolderName(""); setFolderDialogOpen(true) }} variant="outline" className="gap-1"><FolderPlus className="h-3.5 w-3.5" />New folder</Button>
            <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1 bg-brand-500 hover:bg-brand-600 text-white"><Upload className="h-3.5 w-3.5" />Quick Note</Button>
          </div>
          {/* Mobile: collapse action buttons into dropdown menu */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={async () => {
                  try {
                    toast.info("AI Organizing files...")
                    const data = await apiFetch("/api/files/auto-organize", { method: "POST" })
                    toast.success(data?.message || "Organization complete")
                    queryClient.invalidateQueries({ queryKey: ["files"] })
                    queryClient.invalidateQueries({ queryKey: ["folders"] })
                  } catch (e: any) { toast.error(e.message || "Organization failed") }
                }}>
                  ✨ One-click organize
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setNewFolderName(""); setFolderDialogOpen(true) }}>
                  <FolderPlus className="h-4 w-4 mr-2" />New folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />Quick Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 ml-1 sm:ml-2">
            <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-r-none", viewMode === "list" && "bg-zinc-100 dark:bg-zinc-800")} onClick={() => setViewMode("list")}><List className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-l-none", viewMode === "grid" && "bg-zinc-100 dark:bg-zinc-800")} onClick={() => setViewMode("grid")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} folderId={currentFolderId} />}
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className={cn("cursor-pointer hover:text-foreground", !currentFolderId && "text-foreground font-medium")} onClick={() => setCurrentFolder(null)}>All files</span>
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
                {i === path.length - 1 && <span className="text-xs text-zinc-400 ml-1">({sortedFilteredFiles.length})</span>}
              </span>
            ))
          })()}
        </div>
        {currentFolderId && (
          <Link href={`/compile?project=${currentFolderId}`} className="shrink-0 inline-flex items-center gap-1 rounded-md border border-brand-500/20 bg-brand-500/5 px-2.5 py-1 text-xs font-medium text-brand-500 hover:bg-brand-500/10 transition">
            <Sparkles className="h-3 w-3" />
            Compile context
          </Link>
        )}
      </div>
      {viewMode === "grid" && visibleFolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-700">
          {visibleFolders.map((folder: any) => (
            <div key={folder.id} className={cn("rounded-xl border p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-2", dragOverFolderId === folder.id && "ring-2 ring-brand-500 bg-brand-500/5")} onClick={() => setCurrentFolder(folder.id)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId(folder.id) }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={async (e) => { e.preventDefault(); setDragOverFolderId(null); const fileId = e.dataTransfer.getData("text/plain"); if (fileId) { moveFile.mutate({ fileId, folderId: folder.id }); toast.success("Moved to " + folder.name) } }}>
              <div className="flex h-28 items-center justify-center rounded-lg bg-zinc-50/50 dark:bg-zinc-800/50">
                <Folder className="h-14 w-14 text-amber-500" />
              </div>
              <p className="text-sm font-medium truncate">{folder.name}</p>
              {typeof folder.fileCount === "number" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {viewMode === "list" && visibleFolders.length > 0 && (
        <div className="border-b border-zinc-200 dark:border-zinc-700">
          {visibleFolders.map((folder: any) => (
            <div key={folder.id} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors", dragOverFolderId === folder.id && "ring-2 ring-brand-500 bg-brand-500/5")} onClick={() => setCurrentFolder(folder.id)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId(folder.id) }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={async (e) => { e.preventDefault(); setDragOverFolderId(null); const fileId = e.dataTransfer.getData("text/plain"); if (fileId) { moveFile.mutate({ fileId, folderId: folder.id }); toast.success("Moved to " + folder.name) } }}>
              <Folder className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span className="text-sm truncate">{folder.name}</span>
              {typeof folder.fileCount === "number" && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">({folder.fileCount})</span>
              )}
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-zinc-500 dark:text-zinc-400" />
            </div>
          ))}
        </div>
      )}
      {/* Empty state when search/filter yields no results */}
      {sortedFilteredFiles.length === 0 && files.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No files match your search</p>
          {(deferredSearch.trim() || categoryFilter !== "all" || typeFilter !== "all") && (
            <button
              onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setTypeFilter("all") }}
              className="mt-2 text-xs text-brand-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {sortedFilteredFiles.length === 0 ? null : viewMode === "list" ? (
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: virt.getTotalSize() + "px", width: "100%", position: "relative" }}>
          {virt.getVirtualItems().map((row) => {
            const file = sortedFilteredFiles[row.index]
            const isSel = selected.has(file.id) || selectedFileId === file.id
            return (
              <HoverCard openDelay={400} closeDelay={100} key={file.id}>
              <HoverCardTrigger asChild>
              <div onClick={(e) => handleClick(file.id, e)} onDoubleClick={() => router.push(`/files/${file.id}/preview`)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY }) }}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", file.id); e.dataTransfer.effectAllowed = "move" }}
                className={cn("group absolute left-0 top-0 flex w-full cursor-pointer items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-700/50 px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors duration-200", isSel && "bg-brand-50 dark:bg-brand-500/10")}
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
                <div className="truncate flex-1 min-w-[140px] sm:min-w-[280px]">
                  <span className="truncate text-sm flex items-center gap-1.5" title={displayFileName(file.name, file.summary, disambiguators.get(file.id))}>{displayFileName(file.name, file.summary, disambiguators.get(file.id))}<SourceBadge source={file.source} /></span>
                  {fileSubtitle(file.name, file.summary, file.createdAt) && <span className="block text-xs text-zinc-400 dark:text-zinc-500 truncate">{fileSubtitle(file.name, file.summary, file.createdAt)}</span>}
                </div>
                {file.previousVersionId && <span className="shrink-0 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-500">Updated</span>}
                {file.archivedAt && <span className="shrink-0 rounded bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">Archived</span>}
                {staleFileIds.has(file.id) && (
                  <button
                    title="This file may be outdated. Click to dismiss for 30 days."
                    onClick={(e) => {
                      e.stopPropagation()
                      const dismissed = JSON.parse(localStorage.getItem('dismissedOutdatedFiles') || '{}')
                      dismissed[file.id] = new Date().toISOString()
                      localStorage.setItem('dismissedOutdatedFiles', JSON.stringify(dismissed))
                      setStaleFileIds(prev => { const n = new Set(prev); n.delete(file.id); return n })
                      apiFetch(`/api/files/stale/${file.id}/dismiss`, { method: "POST", silent: true }).catch(() => {})
                    }}
                    className="shrink-0 text-amber-500 hover:text-amber-600 text-xs"
                  >⚠️</button>
                )}
                {(() => {
                  const userTags2 = (file.tags || []).filter((t: any) => !isSystemTag(t))
                  const sysTags2 = (file.tags || []).filter((t: any) => isSystemTag(t))
                  // On mobile (< sm), show max 1 tag; on desktop show 2
                  const maxVisibleTags = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2
                  return (
                    <>
                      {userTags2.slice(0, maxVisibleTags).map((tag: any) => (
                        <span key={tag.name} className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: (tag.color || '#4F5BD5') + '20', color: tag.color || '#4F5BD5' }}>{tag.name}</span>
                      ))}
                      {userTags2.length > maxVisibleTags && (
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" title={userTags2.slice(maxVisibleTags).map((t: any) => t.name).join(', ')}>+{userTags2.length - maxVisibleTags}</span>
                      )}
                      {sysTags2.length > 0 && <span className="hidden sm:inline-flex"><CollapsibleSystemTags tags={sysTags2} /></span>}
                    </>
                  )
                })()}
                {file.suggestedFolder && !file.folderId && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="shrink-0 text-brand-500 hover:text-brand-600 transition-colors" onClick={(e) => {
                          e.stopPropagation()
                          const matched = allFolders.find((f: any) => f.name === file.suggestedFolder)
                          if (matched) { moveFile.mutate({ fileId: file.id, folderId: matched.id }) } else { alert("Please create this folder first") }
                        }}>
                          <Lightbulb className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>AI Suggested folder: {file.suggestedFolder} (click to move)</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <StatusIcon status={file.status} error={file.errorMessage} compact />
                <span className="w-20 text-right text-xs text-zinc-500 dark:text-zinc-400 shrink-0 hidden sm:inline" title={new Date(file.updatedAt || file.createdAt).toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })} suppressHydrationWarning>{formatRelativeTime(file.updatedAt || file.createdAt)}</span>
                <span className="w-16 text-right text-xs text-zinc-500 dark:text-zinc-400 shrink-0 hidden sm:inline">{fmtSize(file.size)}</span>
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(file.id, e) }}
                    className="h-7 w-7 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/chat?fileIds=${file.id}&q=Tell me about ${encodeURIComponent(file.name)}`) }}
                    className="h-7 w-7 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
                    title="Ask AI about this file"
                  >
                    <BotMessageSquare className="h-3.5 w-3.5 text-brand-500" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(file.id) }}
                    className="h-7 w-7 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
                    title="Share"
                  >
                    <Share2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDrawer(file.id) }}
                    className="h-7 w-7 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
                    title="File Details"
                  >
                    <Info className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY }) }}
                    className="h-7 w-7 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
                    title="More"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                </div>
              </div>
              </HoverCardTrigger>
              {file.summary && (
                <HoverCardContent side="right" className="w-80">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{cleanSummary(file.summary)}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500/70 dark:text-zinc-400/70">
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
            {sortedFilteredFiles.map((file) => {
              const isSel = selected.has(file.id) || selectedFileId === file.id
              return (
                <div
                  key={file.id}
                  onClick={(e) => handleClick(file.id, e)}
                  onDoubleClick={() => router.push(`/files/${file.id}/preview`)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY }) }}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", file.id); e.dataTransfer.effectAllowed = "move" }}
                  className={cn("group relative rounded-xl border p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-3 overflow-hidden min-w-0", isSel && "bg-brand-50 dark:bg-brand-500/10 ring-2 ring-brand-500")}
                >
                  <div className="flex h-28 items-center justify-center rounded-lg bg-zinc-50/50 dark:bg-zinc-800/50">
                    <TypeIcon type={file.type} name={file.name} className="h-14 w-14" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate flex-1" title={displayFileName(file.name, file.summary, disambiguators.get(file.id))}>{displayFileName(file.name, file.summary, disambiguators.get(file.id))}</p>
                      <SourceBadge source={file.source} />
                    </div>
                    {fileSubtitle(file.name, file.summary, file.createdAt) && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{fileSubtitle(file.name, file.summary, file.createdAt)}</p>}
                  </div>

                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(() => { const ut = (file.tags || []).filter((t: any) => !isSystemTag(t)); return (<>
                        {ut.slice(0, 2).map((tag: any) => (
                          <span key={tag.name} className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: (tag.color || '#4F5BD5') + '20', color: tag.color || '#4F5BD5' }}>{tag.name}</span>
                        ))}
                        {ut.length > 2 && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" title={ut.slice(2).map((t: any) => t.name).join(', ')}>+{ut.length - 2}</span>}
                      </>)})()}
                      {(file.tags || []).filter((t: any) => isSystemTag(t)).length > 0 && (
                        <CollapsibleSystemTags tags={(file.tags || []).filter((t: any) => isSystemTag(t))} />
                      )}
                    </div>
                  )}
                  {file.suggestedFolder && !file.folderId && (
                    <span className="text-xs text-indigo-500">💡 {file.suggestedFolder}</span>
                  )}
                  {/* Grid hover actions */}
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-md p-0.5">
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(file.id, e) }} className="h-6 w-6 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center" title="Download"><Download className="h-3 w-3 text-zinc-500" /></button>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/chat?fileIds=${file.id}&q=Tell me about ${encodeURIComponent(file.name)}`) }} className="h-6 w-6 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center" title="Ask AI"><BotMessageSquare className="h-3 w-3 text-brand-500" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleShare(file.id) }} className="h-6 w-6 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center" title="Share"><Share2 className="h-3 w-3 text-zinc-500" /></button>
                    <button onClick={(e) => { e.stopPropagation(); openDrawer(file.id) }} className="h-6 w-6 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center" title="Details"><Info className="h-3 w-3 text-zinc-500" /></button>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <StatusIcon status={file.status} error={file.errorMessage} />
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{fmtSize(file.size)}</span>
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
          <DropdownMenuContent align="start" side="right" collisionPadding={16}>
            <DropdownMenuItem onClick={() => {
              const file = files.find(f => f.id === contextMenu.fileId)
              setRenameTarget({ fileId: contextMenu.fileId, currentName: file?.name || "" })
              setRenameValue(file?.name || "")
              setContextMenu(null)
            }}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setDeleteTarget(contextMenu.fileId)
              setContextMenu(null)
            }}>Delete</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setMoveTarget(contextMenu.fileId)
              setMoveFolderId("")
              setContextMenu(null)
            }}>Move to folder</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setTagManagerFileId(contextMenu.fileId)
              setContextMenu(null)
            }}>
              🏷️ Manage tags
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              handleShare(contextMenu.fileId)
              setContextMenu(null)
            }}>
              <Share2 className="h-4 w-4 mr-2" />Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              const file = rawFiles?.find((f: any) => f.id === contextMenu?.fileId)
              const isArchived = file?.archivedAt
              try {
                await apiFetch(`/api/files/${contextMenu?.fileId}/${isArchived ? 'unarchive' : 'archive'}`, { method: 'PATCH' })
                queryClient.invalidateQueries({ queryKey: ['files'] })
                toast.success(isArchived ? 'Unarchived' : 'Archived')
              } catch { toast.error('ActionFailed') }
              setContextMenu(null)
            }}>
              📦 {rawFiles?.find((f: any) => f.id === contextMenu?.fileId)?.archivedAt ? 'CancelArchive' : 'Archive'}
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
              📋 Version history
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              router.push(`/chat?fileIds=${contextMenu.fileId}`)
              setContextMenu(null)
            }}>
              <BotMessageSquare className="h-4 w-4 mr-2" />💬 Ask AI about this file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              router.push(`/files/${contextMenu.fileId}/preview`)
              setContextMenu(null)
            }}>
              <Link2 className="h-4 w-4 mr-2" />🔗 View knowledge connections
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-zinc-900 text-white border border-zinc-700 shadow-2xl px-4 py-3 z-50">
          <span className="text-sm font-medium whitespace-nowrap">{selected.size} files selected</span>
          <Button variant="destructive" size="sm" onClick={handleBatchDelete}>Delete</Button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-700 text-white hover:bg-zinc-600 transition" onClick={handleBatchArchive}>Archive</button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-700 text-white hover:bg-zinc-600 transition" onClick={() => setBatchMoveOpen(true)}>Move</button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-700 text-white hover:bg-zinc-600 transition" onClick={handleBatchDownload}>Download</button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-700 text-white hover:bg-zinc-600 transition" onClick={() => {
            if (selected.size > 0) {
              setTagManagerFileIds(Array.from(selected))
              setTagManagerFileId("__batch__")
            }
          }}>Tags</button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-700 text-white hover:bg-zinc-600 transition" onClick={() => {
              const ids = Array.from(selected).join(",")
              router.push(`/chat?fileIds=${ids}`)
            }}>
            💬 Ask AI
          </button>
          <button className="px-3 py-1.5 text-sm font-medium rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition" onClick={() => setSelected(new Set())}>Cancel</button>
        </div>
      )}
      <FirstUploadGuide hasIndexedFile={files.some((f: any) => f.status === "indexed")} />
      {sortedFilteredFiles.length < 5 && sortedFilteredFiles.length > 0 && (
        <div className="border-t border-zinc-200/50 dark:border-zinc-700/50 px-6 py-6">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Quick start</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-brand-500/30 bg-brand-500/5 p-4 hover:border-brand-500/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
                <Upload className="h-4.5 w-4.5 text-brand-500" />
              </div>
              <span className="text-xs font-medium">Upload more files</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">PDF, Word, notes, etc.</span>
            </button>
            <Link
              href="/chat?new=1"
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-green-500/30 bg-green-500/5 p-4 hover:border-green-500/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <MessageSquare className="h-4.5 w-4.5 text-green-500" />
              </div>
              <span className="text-xs font-medium">Try AI chat</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">Ask questions based on your knowledge library</span>
            </Link>
            <Link
              href="/chat"
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-green-500/30 bg-green-500/5 p-4 hover:border-green-500/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Lightbulb className="h-4.5 w-4.5 text-green-500" />
              </div>
              <span className="text-xs font-medium">Knowledge insights</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">Browse AI discoveries</span>
            </Link>
            <Link
              href="/developers"
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-purple-500/30 bg-purple-500/5 p-4 hover:border-purple-500/60 hover:shadow-sm transition text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <FileText className="h-4.5 w-4.5 text-purple-500" />
              </div>
              <span className="text-xs font-medium">Developer docs</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">API Integrations & Automation</span>
            </Link>
          </div>
        </div>
      )}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input placeholder="Files name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) { createFolder.mutate({ name: newFolderName.trim(), parentId: currentFolderId }); setFolderDialogOpen(false) } }} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (newFolderName.trim()) { createFolder.mutate({ name: newFolderName.trim(), parentId: currentFolderId }); setFolderDialogOpen(false) } }} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename file</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && renameValue.trim() && renameTarget) { renameFile.mutate({ fileId: renameTarget.fileId, name: renameValue.trim() }); setRenameTarget(null) } }} placeholder="Enter new name" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.currentName} onClick={() => { if (renameTarget) { renameFile.mutate({ fileId: renameTarget.fileId, name: renameValue.trim() }); setRenameTarget(null) } }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm delete</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Delete this file? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteTarget) { deleteFile.mutate(deleteTarget); setDeleteTarget(null) } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Move Dialog */}
      <Dialog open={batchMoveOpen} onOpenChange={(open) => { if (!open) setBatchMoveOpen(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move to folder in bulk</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <button onClick={() => setMoveFolderId("")} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800", moveFolderId === "" && "bg-zinc-100 dark:bg-zinc-800 font-medium")}>
              <FileText className="h-4 w-4" /> Root
            </button>
            {allFolders.map((f: any) => (
              <button key={f.id} onClick={() => setMoveFolderId(f.id)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800", moveFolderId === f.id && "bg-zinc-100 dark:bg-zinc-800 font-medium")}>
                <Folder className="h-4 w-4 text-amber-500" /> {f.name}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchMoveOpen(false)}>Cancel</Button>
            <Button onClick={() => handleBatchMove(moveFolderId || null)}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share link</DialogTitle></DialogHeader>
          {shareLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              <Input value={shareUrl} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Close</Button>
                <Button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied") }}>Copy</Button>
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
          <div className="fixed inset-y-0 right-0 z-50 w-[520px] border-l bg-background shadow-soft-lg rounded-l-2xl flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">File Details</h3>
              <button onClick={() => closeDrawer()} className="h-8 w-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* File name + meta info */}
            <div className="px-4 pt-3 pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-base font-semibold truncate text-left" title={displayFileName(drawerFile.name, drawerFile.summary)}>{displayFileName(drawerFile.name, drawerFile.summary)}</h2>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">{fmtSize(drawerFile.size)} · {formatFileType(drawerFile.mimeType, drawerFile.name)} · {drawerFile.status === "indexed" ? "Indexed" : drawerFile.status} <SourceBadge source={drawerFile.source} /></p>
            </div>
            {/* Main content area — inline preview */}
            <div className="flex-1 overflow-auto p-4">
              <DrawerInlinePreview fileId={drawerFile.id} fileName={drawerFile.name} mimeType={drawerFile.mimeType} />
            </div>
            {/* Collapsible details section */}
            <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-3 space-y-2 max-h-[35vh] overflow-auto">
              {drawerFile.summary && (
                <details className="group">
                  <summary className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none hover:text-foreground transition">🧠 AI Summary</summary>
                  <p className="text-sm mt-1.5 pl-1">{drawerFile.summary}</p>
                </details>
              )}
              <details className="group">
                <summary className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none hover:text-foreground transition">🏷️ Tags</summary>
                <div className="mt-1.5">
                  <DrawerTagSection fileId={drawerFile.id} drawerTags={drawerTags} setDrawerTags={setDrawerTags} />
                </div>
              </details>
              <details className="group">
                <summary className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none hover:text-foreground transition">📋 File info</summary>
                <div className="mt-1.5 space-y-1.5 pl-1">
                  <div className="flex justify-between text-sm"><span className="text-zinc-500 dark:text-zinc-400">Size</span><span>{fmtSize(drawerFile.size)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-zinc-500 dark:text-zinc-400">Type</span><span>{formatFileType(drawerFile.mimeType, drawerFile.name)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-zinc-500 dark:text-zinc-400">Upload time</span><span>{new Date(drawerFile.createdAt).toLocaleDateString("zh-CN")}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-zinc-500 dark:text-zinc-400">Status</span><span>{drawerFile.status === "indexed" ? "✅ Indexed" : drawerFile.status}</span></div>
                </div>
              </details>
              <div className="flex justify-center pt-1">
                <KnowledgeFeedback fileId={drawerFileId!} />
              </div>
            </div>
            {/* Bottom action buttons */}
            <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center gap-2">
              <Link
                href={`/chat?fileIds=${drawerFile.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white py-2 text-sm transition"
              >
                💬 Ask AI
              </Link>
              <Link
                href={`/files/${drawerFile.id}/preview`}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-800 py-2 text-sm transition"
              >
                👁️ Full preview
              </Link>
              <button
                onClick={() => handleDownload(drawerFile.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-800 py-2 px-3 text-sm transition"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })()}

      {/* Move Dialog */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => { if (!open) setMoveTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move to folder</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <button onClick={() => setMoveFolderId("")} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800", moveFolderId === "" && "bg-zinc-100 dark:bg-zinc-800 font-medium")}>
              <FileText className="h-4 w-4" /> Root
            </button>
            {allFolders.map((f: any) => (
              <button key={f.id} onClick={() => setMoveFolderId(f.id)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800", moveFolderId === f.id && "bg-zinc-100 dark:bg-zinc-800 font-medium")}>
                <Folder className="h-4 w-4 text-amber-500" /> {f.name}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button onClick={() => { if (moveTarget) { moveFile.mutate({ fileId: moveTarget, folderId: moveFolderId || null }); setMoveTarget(null) } }}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!versionFileId} onOpenChange={() => setVersionFileId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>📋 Version history</DialogTitle></DialogHeader>
          {versions.length <= 1 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No other versions</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {versions.map((v: any) => (
                <div key={v.id} className={cn("flex items-center justify-between rounded-lg border p-3", v.id === versionFileId && "border-brand-500 bg-brand-500/5")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(v.createdAt).toLocaleString("zh-CN")} · {fmtSize(v.size)}</p>
                  </div>
                  <Link href={`/files/${v.id}/preview`} className="text-xs text-brand-500 hover:underline shrink-0 ml-2">Preview</Link>
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
