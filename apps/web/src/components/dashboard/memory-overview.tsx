"use client"

import { useState, useEffect } from "react"
import { Brain, FileText, MessageSquare, Sparkles, ArrowRight } from "lucide-react"
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
    "competitive": "Competitive analysis", "analysis": "", "test": "Test",
    "report": "Report", "design": "Design", "product": "Product",
    "tech": "Technical", "guide": "Guide", "spec": "Specs",
    "resume": "Resume", "cv": "Resume", "deepseek": "DeepSeek",
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
  const [weeklyStats, setWeeklyStats] = useState<any>(null)

  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])
  const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
  const indexedFiles = files.filter((f: any) => f.status === "indexed")
  const totalFiles = files.length
  const totalConvs = convs.length

  useEffect(() => {
    apiFetch("/api/users/me/knowledge-profile", { silent: true })
      .then((data: KnowledgeProfile) => setProfile(data))
      .catch(() => {})
    apiFetch("/api/users/me/stats", { silent: true })
      .then((data: any) => setWeeklyStats(data))
      .catch(() => {})
  }, [])

  if (totalFiles === 0 && !profile) return null

  // Fallback topics from filenames when profile API fails
  const fallbackTopics = extractTopics(files)
  const types = new Set<string>()
  if (!profile && fallbackTopics.length === 0) {
    files.forEach((f: any) => {
      const ext = (f.name || f.originalName || "").split(".").pop()?.toLowerCase()
      if (ext === "pdf") types.add("PDF Document")
      else if (ext === "md" || ext === "markdown") types.add("Markdown Notes")
      else if (ext === "txt") types.add("Text files")
      else if (ext === "docx" || ext === "doc") types.add("Word Document")
      else if (ext) types.add(ext.toUpperCase() + " Files")
    })
  }

  return (
    <>
    <div className="mx-4 mt-4 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 shadow-lg shadow-indigo-500/30">
          <Brain className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Your AI memory</h3>
            {indexedFiles.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                <Sparkles className="h-3 w-3" /> Active
              </span>
            )}
          </div>

          {profile && profile.topics.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                AI organized <strong className="text-foreground">{profile.topics.length}</strong>  knowledge categories
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
                  plus {profile.unclassifiedCount}  files to classify
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              AI Remembered <strong className="text-foreground">{indexedFiles.length}</strong>  files
              {fallbackTopics.length > 0
                ? <span>，covering {fallbackTopics.join("、")}</span>
                : types.size > 0 && <span>，covering {[...types].slice(0, 3).join("、")}</span>}
              {totalFiles > indexedFiles.length && (
                <span className="text-yellow-500">（{totalFiles - indexedFiles.length}  processing)</span>
              )}
            </p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {indexedFiles.length}  files
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {totalConvs}  conversations
            </span>
            {weeklyStats && (
              <span className="flex items-center gap-1 text-blue-400">
                📊 This week {weeklyStats.filesThisWeek} Files · {weeklyStats.conversationsThisWeek} conversations
              </span>
            )}
            <Link href="/chat" className="ml-auto text-xs text-indigo-500 hover:underline">
              Ask your AI →
            </Link>
          </div>
        </div>
      </div>
    </div>
    <Link href="/chat" className="mx-4 mt-3 mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition">
      <MessageSquare className="h-4 w-4 text-indigo-500" />
      <span>Ask your AI anything...</span>
      <ArrowRight className="ml-auto h-4 w-4" />
    </Link>
    </>
  )
}
