"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"

export function ReportSection() {
  const [report, setReport] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    apiFetch("/api/reports/latest")
      .then((data: any) => { if (data?.report) setReport(data.report) })
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const data = await apiFetch("/api/reports/generate", { method: "POST" })
      if (data?.report) setReport(data.report)
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

  return (
    <div className="mx-4 mb-4 space-y-3">
      <Button onClick={handleGenerate} disabled={generating} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
        {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />正在生成分析报告...</> : <>📊 生成分析报告</>}
      </Button>
      {report && (
        <div className="rounded-xl border p-6 relative">
          <button onClick={handleExport} className="absolute top-4 right-4 rounded-md bg-muted p-2 hover:bg-muted/80">
            <Download className="h-4 w-4" />
          </button>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
