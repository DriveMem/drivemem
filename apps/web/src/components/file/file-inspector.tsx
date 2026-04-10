"use client"

import { FileText, Loader2, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFile } from "@/hooks/use-files"
import { useLayoutStore } from "@/stores/layout-store"

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function truncateSummary(summary: string, maxLen = 80): string {
  const firstLine = summary.split("\n")[0]
  if (firstLine.length <= maxLen) return firstLine
  return firstLine.slice(0, maxLen) + "…"
}

export function FileInspector({ fileId }: { fileId: string }) {
  const { data: file, isLoading, error } = useFile(fileId)
  const { openDrawer } = useLayoutStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" /><span>文件未找到</span>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
      </div>
      {file.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {truncateSummary(file.summary)}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-xs"
        onClick={() => openDrawer(fileId)}
      >
        <Info className="h-3.5 w-3.5" />
        查看完整详情
      </Button>
    </div>
  )
}
