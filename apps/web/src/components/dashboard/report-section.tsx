"use client"
import { useState, forwardRef, useImperativeHandle } from "react"
import { apiFetch } from "@/lib/api"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Download, Share2, Copy, Check, FileText } from "lucide-react"
import { toast } from "sonner"

export interface ReportSectionHandle {
  generate: (type: "analysis" | "study" | "competitive") => void
}

export const ReportSection = forwardRef<ReportSectionHandle>(function ReportSection(_props, ref) {
  const [report, setReport] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (type: "analysis" | "study" | "competitive" = "analysis") => {
    setGenerating(true)
    try {
      const data = await apiFetch("/api/reports/generate", { method: "POST", body: JSON.stringify({ type }) })
      if (data?.report) setReport(data.report)
      if (data?.id) setReportId(data.id)
    } catch { toast.error("报告生成失败，请稍后重试") } finally { setGenerating(false) }
  }

  useImperativeHandle(ref, () => ({ generate: handleGenerate }))

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
    } catch { toast.error("分享失败") } finally { setSharing(false) }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-3 mb-3">
      {generating ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          报告生成中...
        </div>
      ) : report ? (
        <div className="rounded-xl border p-4 relative">
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button onClick={handleShare} disabled={sharing || !reportId} className="rounded-md bg-muted p-1.5 hover:bg-muted/80 disabled:opacity-50 transition-colors duration-150">
              {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
            </button>
            <button onClick={handleExport} className="rounded-md bg-muted p-1.5 hover:bg-muted/80 transition-colors duration-150">
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          点击上方按钮生成 AI 报告
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
})
