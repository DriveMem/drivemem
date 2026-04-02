"use client"

import { Brain, FileText, MessageSquare, Sparkles } from "lucide-react"
import { useFiles } from "@/hooks/use-files"
import { useConversations } from "@/hooks/use-conversations"
import Link from "next/link"

export function MemoryOverview() {
  const { data: filesData } = useFiles()
  const { data: convsData } = useConversations()

  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])
  const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
  const indexedFiles = files.filter((f: any) => f.status === "indexed")
  const totalFiles = files.length
  const totalConvs = convs.length

  if (totalFiles === 0) return null

  // Derive file types for context
  const types = new Set<string>()
  files.forEach((f: any) => {
    const ext = (f.name || f.originalName || "").split(".").pop()?.toLowerCase()
    if (ext === "pdf") types.add("PDF 文档")
    else if (ext === "md" || ext === "markdown") types.add("Markdown 笔记")
    else if (ext === "txt") types.add("文本文件")
    else if (ext === "docx" || ext === "doc") types.add("Word 文档")
    else if (ext) types.add(ext.toUpperCase() + " 文件")
  })

  return (
    <div className="mx-4 mt-4 rounded-xl border bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
          <Brain className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">你的 AI 记忆</h3>
            {indexedFiles.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                <Sparkles className="h-3 w-3" /> 活跃
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 已记住 <strong className="text-foreground">{indexedFiles.length}</strong> 个文件
            {types.size > 0 && <span>，涵盖 {[...types].slice(0, 3).join("、")}</span>}
            {totalFiles > indexedFiles.length && (
              <span className="text-yellow-500">（{totalFiles - indexedFiles.length} 个处理中）</span>
            )}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {totalFiles} 个文件
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {totalConvs} 次对话
            </span>
            <Link href="/chat" className="ml-auto text-xs text-blue-500 hover:underline">
              问你的 AI →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
