"use client"

import { Brain, FileText, MessageSquare, Sparkles } from "lucide-react"
import { useFiles } from "@/hooks/use-files"
import { useConversations } from "@/hooks/use-conversations"
import Link from "next/link"

const STOP_WORDS = new Set([
  "本文档", "本文", "文档", "摘要", "内容", "介绍", "分析了", "描述了",
  "总结", "概述", "核心", "主要", "包括", "以及", "其中", "通过",
  "基于", "关于", "用于", "提供", "支持", "功能", "进行", "实现",
  "使用", "一个", "这个", "该文", "详细", "介绍了", "测试", "验证",
  "绍了", "文档介", "本文档介", "档介绍", "针对", "涉及", "方面",
  "目的", "方法", "过程", "结果", "系统", "平台", "工具", "模型",
])

function extractTopics(files: any[]): string[] {
  const topics: string[] = []
  const seen = new Set<string>()

  const add = (w: string) => {
    if (!w || w.length < 2 || STOP_WORDS.has(w) || seen.has(w)) return
    // Reject fragments that end with common verb suffixes or start mid-word
    if (/^[了的着过得]/.test(w) || /[了的着过得]$/.test(w) && w.length <= 2) return
    seen.add(w)
    topics.push(w)
  }

  // 1. Extract from file names
  const nameMap: Record<string, string> = {
    "competitive": "竞品分析", "analysis": "分析", "test": "测试",
    "report": "报告", "design": "设计", "product": "产品",
    "tech": "技术", "guide": "指南", "spec": "规格",
  }

  for (const f of files) {
    const name = (f.name || f.originalName || "").replace(/\.[^.]+$/, "")
    // Chinese phrases from name
    const cn = name.match(/[\u4e00-\u9fff]{2,6}/g) || []
    cn.forEach(add)
    // Map English words
    const words = name.toLowerCase().split(/[-_\s]+/)
    words.forEach((w: string) => { if (nameMap[w]) add(nameMap[w]) })
  }

  // 2. If need more, extract from summaries
  if (topics.length < 3) {
    for (const f of files) {
      if (!f.summary || topics.length >= 5) continue
      // Extract 2-4 char Chinese phrases, skip stop words
      const matches = f.summary.match(/[\u4e00-\u9fff]{2,4}/g) || []
      for (const w of matches) {
        if (topics.length >= 5) break
        add(w)
      }
    }
  }

  // Filter out short words already contained in longer ones
  const filtered = topics.filter((t, i) => !topics.some((other, j) => j !== i && other.length > t.length && other.includes(t)))
  return filtered.slice(0, 3)
}

export function MemoryOverview() {
  const { data: filesData } = useFiles()
  const { data: convsData } = useConversations()

  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])
  const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
  const indexedFiles = files.filter((f: any) => f.status === "indexed")
  const totalFiles = files.length
  const totalConvs = convs.length

  if (totalFiles === 0) return null

  const topics = extractTopics(files)

  // Fallback to file types
  const types = new Set<string>()
  if (topics.length === 0) {
    files.forEach((f: any) => {
      const ext = (f.name || f.originalName || "").split(".").pop()?.toLowerCase()
      if (ext === "pdf") types.add("PDF 文档")
      else if (ext === "md" || ext === "markdown") types.add("Markdown 笔记")
      else if (ext === "txt") types.add("文本文件")
      else if (ext === "docx" || ext === "doc") types.add("Word 文档")
      else if (ext) types.add(ext.toUpperCase() + " 文件")
    })
  }

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
            {topics.length > 0
              ? <span>，涵盖 {topics.join("、")}</span>
              : types.size > 0 && <span>，涵盖 {[...types].slice(0, 3).join("、")}</span>}
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
