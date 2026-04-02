"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FileText, Loader2, CheckCircle2, XCircle, ArrowUpDown, Upload, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLayoutStore } from "@/stores/layout-store"
import { useFiles, useDeleteFile } from "@/hooks/use-files"
import { FileUpload } from "./file-upload"

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
}

function fmtSize(b: number) { return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB" }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }

function TypeIcon({ type }: { type: string }) {
  const c: Record<string, string> = { pdf: "text-red-400", txt: "text-gray-400", md: "text-teal-400", image: "text-blue-400" }
  return <FileText className={cn("h-4 w-4 flex-shrink-0", c[type])} />
}

function StatusIcon({ status, error }: { status: string; error?: string }) {
  if (status === "parsing") return <span className="flex items-center gap-1 text-xs text-yellow-500"><Loader2 className="h-3 w-3 animate-spin" />AI 正在记住...</span>
  if (status === "indexed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
  return <span title={error}><XCircle className="h-3.5 w-3.5 text-red-500" /></span>
}

export function FileList() {
  const { currentFolderId, openInspector, selectedFileId } = useLayoutStore()
  const { data, isLoading, error } = useFiles(currentFolderId)
  const deleteFile = useDeleteFile()
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
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

  const virt = useVirtualizer({ count: files.length, getScrollElement: () => parentRef.current, estimateSize: () => 48, overscan: 5 })

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
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /><span>加载中...</span>
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

  if (files.length === 0 && !showUpload) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <Upload className="h-12 w-12" /><p className="text-lg">把文件拖到这里，让 AI 记住它</p>
        <Button onClick={() => setShowUpload(true)}>上传文件</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => toggleSort("name")} className="gap-1 text-xs">名称 <ArrowUpDown className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggleSort("createdAt")} className="gap-1 text-xs">时间 <ArrowUpDown className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={() => toggleSort("size")} className="gap-1 text-xs">大小 <ArrowUpDown className="h-3 w-3" /></Button>
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1"><Upload className="h-3.5 w-3.5" /> 上传</Button>
      </div>
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: virt.getTotalSize() + "px", width: "100%", position: "relative" }}>
          {virt.getVirtualItems().map((row) => {
            const file = files[row.index]
            const isSel = selected.has(file.id) || selectedFileId === file.id
            return (
              <div key={file.id} onClick={(e) => handleClick(file.id, e)}
                className={cn("absolute left-0 top-0 flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 hover:bg-accent/50", isSel && "bg-accent")}
                style={{ height: row.size + "px", transform: "translateY(" + row.start + "px)" }}>
                <TypeIcon type={file.type} />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <StatusIcon status={file.status} error={file.errorMessage} />
                <span className="w-16 text-right text-xs text-muted-foreground">{fmtSize(file.size)}</span>
                <span className="w-28 text-right text-xs text-muted-foreground">{fmtDate(file.createdAt)}</span>
              </div>
            )
          })}
        </div>
      </div>
      {selected.size > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-2">
          <span className="text-sm">已选择 {selected.size} 个文件</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>取消</Button>
            <Button variant="destructive" size="sm" onClick={() => { selected.forEach(id => deleteFile.mutate(id)); setSelected(new Set()) }}>删除</Button>
          </div>
        </div>
      )}
    </div>
  )
}
