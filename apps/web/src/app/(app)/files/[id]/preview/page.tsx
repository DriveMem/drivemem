"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useFile } from "@/hooks/use-files"
import { Loader2, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"

function getFileType(name: string): string {
  const ext = name?.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf") return "pdf"
  if (ext === "md" || ext === "markdown") return "md"
  if (ext === "txt") return "txt"
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image"
  return "other"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(status: string): string {
  switch (status) {
    case "indexed": return "✅ AI 已记住"
    case "processing": return "🔄 AI 正在记住..."
    case "failed": return "❌ 处理失败"
    case "uploaded": return "⏳ 等待处理"
    default: return status || "未知"
  }
}

export default function FilePreviewPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading, error } = useFile(params.id)

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Handle both { file: {...} } and direct object
  const file = data?.file || data
  if (error || !file) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>文件不存在或加载失败</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">返回文件列表</Link>
        </Button>
      </div>
    )
  }

  const fileType = getFileType(file.name || file.originalName || "")
  const fileName = file.name || file.originalName || "未命名文件"

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{fileName}</h1>
      </div>

      <div className="flex gap-6">
        {/* Main preview area */}
        <div className="flex-1">
          {fileType === "pdf" && (
            <div className="flex h-96 flex-col items-center justify-center gap-3 rounded border bg-muted text-muted-foreground">
              <FileText className="h-12 w-12" />
              <p>PDF 文件 — AI 已记住内容</p>
              <p className="text-xs">可在 AI 对话中询问此文件相关问题</p>
            </div>
          )}
          {(fileType === "md" || fileType === "txt" || fileType === "other") && (
            <div className="flex h-96 flex-col items-center justify-center gap-3 rounded border bg-muted text-muted-foreground">
              <FileText className="h-12 w-12" />
              <p>{fileType.toUpperCase()} 文件</p>
              <p className="text-xs">AI 已记住此文件内容，可在对话中提问</p>
            </div>
          )}
          {fileType === "image" && (
            <div className="flex h-96 items-center justify-center rounded border bg-muted text-muted-foreground">
              <p>图片预览暂不支持</p>
            </div>
          )}
        </div>

        {/* File info sidebar */}
        <Card className="w-72 shrink-0">
          <CardContent className="space-y-4 p-4">
            <h2 className="font-semibold">文件信息</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">文件名</dt>
                <dd className="break-all">{fileName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">类型</dt>
                <dd>{file.mimeType || fileType.toUpperCase()}</dd>
              </div>
              {file.size && (
                <div>
                  <dt className="text-muted-foreground">大小</dt>
                  <dd>{formatSize(file.size)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">状态</dt>
                <dd>{statusLabel(file.status || file.parseStatus)}</dd>
              </div>
              {file.errorMessage && (
                <div>
                  <dt className="text-muted-foreground">错误</dt>
                  <dd className="text-destructive">{file.errorMessage}</dd>
                </div>
              )}
              {file.createdAt && (
                <div>
                  <dt className="text-muted-foreground">上传时间</dt>
                  <dd>{new Date(file.createdAt).toLocaleString("zh-CN")}</dd>
                </div>
              )}
            </dl>
            <Button className="w-full" asChild>
              <Link href={`/chat?file=${file.id}`}>对此文件提问</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
