"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, MessageSquare, FileText, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFiles } from "@/hooks/use-api"
import { api } from "@/lib/api-client"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function FilePreview({ fileId }: { fileId: string }) {
  const router = useRouter()
  const { data: files } = useFiles()
  const file = files?.find((f) => f.id === fileId)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<{ url: string }>(`/files/${fileId}/download`)
        const res = await fetch(data.url)
        if (!res.ok) throw new Error("Download failed")

        const mime = file?.mimeType || ""
        if (mime.includes("pdf")) {
          // PDF: just store the URL, render in iframe
          setContent(data.url)
        } else {
          setContent(await res.text())
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败")
      }
      setLoading(false)
    }
    load()
  }, [fileId, file?.mimeType])

  const isPdf = file?.mimeType?.includes("pdf")
  const isMd = file?.mimeType?.includes("markdown") || file?.name?.endsWith(".md")

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1 truncate font-medium text-sm">{file?.name || "文件预览"}</span>
        <Button size="sm" className="gap-1" asChild><Link href={`/chat?file=${fileId}`}><MessageSquare className="h-3.5 w-3.5" />问 AI</Link></Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8" /><p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => router.back()}>返回</Button>
          </div>
        ) : isPdf && content ? (
          <iframe src={content} className="w-full h-full border-0" title="PDF Preview" />
        ) : isMd && content ? (
          <div className="prose prose-sm dark:prose-invert max-w-3xl mx-auto p-6">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
          </div>
        ) : content !== null ? (
          <pre className="p-6 text-sm font-mono whitespace-pre-wrap break-words">{content}</pre>
        ) : null}
      </div>
    </div>
  )
}
