"use client"

import { useState, useEffect } from "react"
import { FileText, MessageSquare, Loader2, AlertCircle, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFile, useMoveFile } from "@/hooks/use-files"
import { useFolders } from "@/hooks/use-folders"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

export function FileInspector({ fileId }: { fileId: string }) {
  const { data: file, isLoading, error } = useFile(fileId)
  const moveFile = useMoveFile()
  const { data: foldersData } = useFolders()
  const allFolders = foldersData?.folders || []

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

  const typeLabels: Record<string, string> = { pdf: "PDF 文档", txt: "文本文件", md: "Markdown", image: "图片" }
  const statusLabels: Record<string, string> = { parsing: "AI 正在记住...", done: "已记住", error: "记忆失败" }
  const statusColors: Record<string, string> = { parsing: "text-yellow-500", done: "text-green-500", error: "text-red-500" }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">{typeLabels[file.type] || file.type}</p>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">大小</span><span>{formatSize(file.size)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">上传时间</span><span>{new Date(file.createdAt).toLocaleString("zh-CN")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">状态</span><span className={statusColors[file.parseStatus]}>{statusLabels[file.parseStatus]}</span></div>
        {file.parseError && <div className="text-xs text-red-500 bg-red-500/10 rounded p-2">{file.parseError}</div>}
      </div>
      {file.summary && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">AI 摘要</p>
          <p className="text-sm leading-relaxed">{file.summary}</p>
        </div>
      )}
      {file.suggestedFolder && !file.folderId && (
        <div className="space-y-2 rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
          <p className="text-sm">🧠 AI 分类建议：{file.suggestedFolder}</p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              const matched = allFolders.find((f: any) => f.name === file.suggestedFolder)
              if (matched) {
                moveFile.mutate({ fileId: file.id, folderId: matched.id })
              } else {
                alert("请先创建此文件夹")
              }
            }}
          >
            一键移入
          </Button>
        </div>
      )}
      <KnowledgeLinksForFile fileId={fileId} />
      <Button className="w-full gap-2" asChild>
        <Link href={"/chat?file=" + file.id}><MessageSquare className="h-4 w-4" />问 AI 关于这个文件</Link>
      </Button>
    </div>
  )
}

function KnowledgeLinksForFile({ fileId }: { fileId: string }) {
  const [links, setLinks] = useState<any[]>([])
  useEffect(() => {
    apiFetch("/api/users/me/knowledge-links")
      .then((data: any) => {
        const all = data?.links || []
        setLinks(all.filter((l: any) => l.fileAId === fileId || l.fileBId === fileId))
      })
      .catch(() => {})
  }, [fileId])
  if (links.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">🔗 知识关联</p>
      {links.map((l: any) => {
        const otherName = l.fileAId === fileId ? l.fileBName : l.fileAName
        const otherIdVal = l.fileAId === fileId ? l.fileBId : l.fileAId
        return (
          <Link key={l.id} href={`/files/${otherIdVal}/preview`} className="block text-xs text-blue-400 hover:underline truncate">
            {l.relationType === "similar" ? "🔗" : l.relationType === "complementary" ? "🤝" : "⚡"} {otherName} — {l.description}
          </Link>
        )
      })}
    </div>
  )
}
