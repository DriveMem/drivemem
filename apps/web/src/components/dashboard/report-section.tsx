"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Download, Share2, Copy, Check } from "lucide-react"

export function ReportSection() {
  const [report, setReport] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiFetch("/api/reports/latest")
      .then((data: any) => {
        if (data?.report) setReport(data.report)
        if (data?.id) setReportId(data.id)
      })
      .catch(() => {})
  }, [])

  const handleGenerate = async (type: "analysis" | "study" = "analysis") => {
    setGenerating(true)
    try {
      const data = await apiFetch("/api/reports/generate", { method: "POST", body: JSON.stringify({ type }) })
      if (data?.report) setReport(data.report)
      if (data?.id) setReportId(data.id)
    } catch {} finally { setGenerating(false) }
  }

  const handleExport = () => {
    if (!report) return
    const blob = new Blob([report], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `AI-Drive-分析报告-${new Date().toISOString().slice(0,10)}.md`
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

  return (
    <div className="mx-4 mb-4 space-y-3">
      <div className="flex gap-2">
        <Button onClick={() => handleGenerate("analysis")} disabled={generating} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />生成中...</> : <>📊 分析报告</>}
        </Button>
        <Button onClick={() => handleGenerate("study")} disabled={generating} variant="outline" className="flex-1">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />生成中...</> : <>📝 学习笔记</>}
        </Button>
      </div>
      {report && (
        <div className="rounded-xl border p-6 relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={handleShare} disabled={sharing || !reportId} className="rounded-md bg-muted p-2 hover:bg-muted/80 disabled:opacity-50">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            </button>
            <button onClick={handleExport} className="rounded-md bg-muted p-2 hover:bg-muted/80">
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享报告</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">任何拥有此链接的人都可以查看报告</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl || ""}
              className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={handleCopy}>
              {copied ? <><Check className="h-4 w-4 mr-1" />已复制</> : <><Copy className="h-4 w-4 mr-1" />复制</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
