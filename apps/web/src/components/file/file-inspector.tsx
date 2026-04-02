"use client"
import { FileText, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFiles, type FileItem } from "@/hooks/use-api"
import Link from "next/link"

function formatSize(b: number) { return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB" }

function fileTypeLabel(mime: string) {
  if (mime.includes("pdf")) return "PDF 文档"
  if (mime.includes("markdown") || mime.includes("md")) return "Markdown"
  if (mime.includes("text")) return "文本文件"
  if (mime.includes("image")) return "图片"
  return mime
}

export function FileInspector({ fileId }: { fileId: string }) {
  const { data: files } = useFiles()
  const file = files?.find((f) => f.id === fileId)
  if (!file) return <div className="p-4 text-sm text-muted-foreground">文件未找到</div>

  const statusLabels: Record<string, string> = { pending: "AI 正在记住...", parsing: "AI 正在记住...", done: "已记住", parsed: "已记住", failed: "记忆失败", error: "记忆失败" }
  const statusColors: Record<string, string> = { pending: "text-yellow-500", parsing: "text-yellow-500", done: "text-green-500", parsed: "text-green-500", failed: "text-red-500", error: "text-red-500" }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3"><FileText className="h-8 w-8 text-muted-foreground" /><div><p className="font-medium text-sm">{file.name}</p><p className="text-xs text-muted-foreground">{fileTypeLabel(file.mimeType)}</p></div></div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">大小</span><span>{formatSize(file.size)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">上传时间</span><span>{new Date(file.createdAt).toLocaleString("zh-CN")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">状态</span><span className={statusColors[file.parseStatus] || "text-muted-foreground"}>{statusLabels[file.parseStatus] || file.parseStatus}</span></div>
        {file.parseError && <div className="text-xs text-red-500 bg-red-500/10 rounded p-2">{file.parseError}</div>}
      </div>
      <Button className="w-full gap-2" asChild><Link href={"/chat?file=" + file.id}><MessageSquare className="h-4 w-4" />问 AI 关于这个文件</Link></Button>
    </div>
  )
}
