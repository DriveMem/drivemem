"use client"

import { useState, useEffect } from "react"
import { Brain, FileText, MessageSquare, Sparkles, FileBarChart, BookOpen, Network, Loader2, Download, Share2, Copy, Check } from "lucide-react"
import { useFiles } from "@/hooks/use-files"
import { useConversations } from "@/hooks/use-conversations"
import { apiFetch } from "@/lib/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function AiHub() {
  const { data: filesData } = useFiles()
  const { data: convsData } = useConversations()
  const [insight, setInsight] = useState<string | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<any>(null)
  const [report, setReport] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatingType, setGeneratingType] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])
  const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
  const indexedFiles = files.filter((f: any) => f.status === "indexed")
  const totalFiles = files.length
  const totalConvs = convs.length

  useEffect(() => {
    apiFetch("/api/users/me/insights")
      .then((data: any) => setInsight(data?.insight || null))
      .catch(() => {})
    apiFetch("/api/users/me/stats")
      .then((data: any) => setWeeklyStats(data))
      .catch(() => {})
  }, [])

  const handleGenerate = async (type: "analysis" | "study" | "competitive") => {
    setGenerating(true)
    setGeneratingType(type)
    try {
      const data = await apiFetch("/api/reports/generate", { method: "POST", body: JSON.stringify({ type }) })
      if (data?.report) setReport(data.report)
      if (data?.id) setReportId(data.id)
    } catch {} finally {
      setGenerating(false)
      setGeneratingType(null)
    }
  }

  const handleExport = () => {
    if (!report) return
    const blob = new Blob([report], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `AI-Drive-Analysis-Report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (!reportId) return
    setSharing(true)
    try {
      const data = await apiFetch(`/api/reports/${reportId}/share`, { method: "POST" })
      if (data?.url) {
        setShareUrl(data.url)
        setShareDialogOpen(true)
      }
    } catch {} finally { setSharing(false) }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const quickActions = [
    { label: "Ask AI", icon: MessageSquare, href: "/chat", color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Analysis Report", icon: FileBarChart, action: () => handleGenerate("analysis"), color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Study Notes", icon: BookOpen, action: () => handleGenerate("study"), color: "text-pink-400", bg: "bg-pink-500/10" },
    { label: "Knowledge connections", icon: Network, href: "#knowledge-links", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ]

  return (
    <div className="mx-4 mt-4 mb-4 space-y-3">
      {/* Main AI Hub Card */}
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 p-4">
        {/* Header: AI Memory Status */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 shadow-lg shadow-blue-500/20">
            <Brain className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">AI conversations</h3>
              {indexedFiles.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-500">
                  <Sparkles className="h-2.5 w-2.5" /> Active
                </span>
              )}
            </div>
          </div>
          <Link href="/chat" className="text-xs text-blue-500 hover:underline shrink-0">
            Chat →
          </Link>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 px-1">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> {indexedFiles.length}/{totalFiles} FilesIndexed
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {totalConvs}  conversations
          </span>
          {weeklyStats && (
            <span className="flex items-center gap-1 text-blue-400">
              This week +{weeklyStats.filesThisWeek ?? 0} Files · +{weeklyStats.conversationsThisWeek ?? 0} conversations
            </span>
          )}
        </div>

        {/* AI Insight */}
        {insight && (
          <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 px-3 py-2 mb-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Sparkles className="h-3 w-3 text-purple-400 inline mr-1" />
              {insight.length > 100 ? insight.slice(0, 100) + "..." : insight}
            </p>
          </div>
        )}

        {/* Quick Actions 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => {
            const isGenerating = generating && (
              (action.label === "Analysis Report" && generatingType === "analysis") ||
              (action.label === "Study Notes" && generatingType === "study")
            )
            const Icon = action.icon

            if (action.href) {
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm hover:bg-muted/50 transition"
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${action.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${action.color}`} />
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              )
            }

            return (
              <button
                key={action.label}
                onClick={action.action}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm hover:bg-muted/50 transition disabled:opacity-50"
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${action.bg}`}>
                  {isGenerating ? (
                    <Loader2 className={`h-3.5 w-3.5 ${action.color} animate-spin`} />
                  ) : (
                    <Icon className={`h-3.5 w-3.5 ${action.color}`} />
                  )}
                </div>
                <span className="text-xs font-medium">{isGenerating ? "Generating..." : action.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Report Output (shown after generation) */}
      {report && (
        <div className="mx-0 rounded-xl border p-4 relative">
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button onClick={handleShare} disabled={sharing || !reportId} className="rounded-md bg-muted p-1.5 hover:bg-muted/80 disabled:opacity-50">
              {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
            </button>
            <button onClick={handleExport} className="rounded-md bg-muted p-1.5 hover:bg-muted/80">
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </div>
        </div>
      )}

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Anyone with this link can view the report</p>
          <div className="flex items-center gap-2">
            <input readOnly value={shareUrl || ""} className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm" />
            <Button size="sm" onClick={handleCopy}>
              {copied ? <><Check className="h-4 w-4 mr-1" />Copied</> : <><Copy className="h-4 w-4 mr-1" />Copy</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
