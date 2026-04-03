"use client"

import { useState, useEffect } from "react"
import { Brain, FileText, MessageSquare, Sparkles } from "lucide-react"
import { useFiles } from "@/hooks/use-files"
import { useConversations } from "@/hooks/use-conversations"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

interface KnowledgeProfile {
  topics: Array<{ topic: string; fileCount: number }>
  unclassifiedCount: number
  totalFiles: number
}

function extractTopics(files: any[]): string[] {
  const topics: string[] = []
  const seen = new Set<string>()

  const add = (w: string) => {
    if (!w || w.length < 2 || seen.has(w)) return
    seen.add(w)
    topics.push(w)
  }

  const nameMap: Record<string, string> = {
    "competitive": "竞品分析", "analysis": "", "test": "测试",
    "report": "报告", "design": "设计", "product": "产品",
    "tech": "技术", "guide": "指南", "spec": "规格",
    "resume": "简历", "cv": "简历", "deepseek": "DeepSeek",
    "drive": "", "ai": "", "web": "", "app": "", "doc": "", "docs": "",
  }

  for (const f of files) {
    if (topics.length >= 5) break
    const name = (f.name || f.originalName || "").replace(/\.[^.]+$/, "")
    const cnPhrases = name.match(/[\u4e00-\u9fff]{2,8}/g) || []
    for (const phrase of cnPhrases) {
      if (phrase.length >= 2 && phrase.length <= 8) add(phrase)
    }
    const words = name.toLowerCase().split(/[-_\s]+/)
    for (const w of words) {
      const mapped = nameMap[w]
      if (mapped) add(mapped)
    }
  }

  const filtered = topics.filter((t, i) => !topics.some((other, j) => j !== i && other.length > t.length && other.includes(t)))
  return filtered.slice(0, 3)
}

export function MemoryOverview() {
  const { data: filesData } = useFiles()
  const { data: convsData } = useConversations()
  const [profile, setProfile] = useState<KnowledgeProfile | null>(null)

  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])
  const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
  const indexedFiles = files.filter((f: any) => f.status === "indexed")
  const totalFiles = files.length
  const totalConvs = convs.length

  useEffect(() => {
    apiFetch("/api/users/me/knowledge-profile")
      .then((data: KnowledgeProfile) => setProfile(data))
      .catch(() => {/* fallback to file-based extraction */})
  }, [])

  if (totalFiles === 0 && !profile) return null

  // Fallback topics from filenames when profile API fails
  const fallbackTopics = extractTopics(files)
  const types = new Set<string>()
  if (!profile && fallbackTopics.length === 0) {
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

          {profile && profile.topics.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                AI 了解你关注的 <strong className="text-foreground">{profile.topics.length}</strong> 个领域
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.topics.map((t) => (
                  <span key={t.topic} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                    {t.topic}（{t.fileCount}）
                  </span>
                ))}
              </div>
              {profile.unclassifiedCount > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  另有 {profile.unclassifiedCount} 个文件待分类
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              AI 已记住 <strong className="text-foreground">{indexedFiles.length}</strong> 个文件
              {fallbackTopics.length > 0
                ? <span>，涵盖 {fallbackTopics.join("、")}</span>
                : types.size > 0 && <span>，涵盖 {[...types].slice(0, 3).join("、")}</span>}
              {totalFiles > indexedFiles.length && (
                <span className="text-yellow-500">（{totalFiles - indexedFiles.length} 个处理中）</span>
              )}
            </p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {profile?.totalFiles ?? totalFiles} 个文件
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
