"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { FileText, Clock } from "lucide-react"
import Link from "next/link"

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "text-red-500"
  if (ext === "docx" || ext === "doc") return "text-blue-600"
  if (ext === "pptx" || ext === "ppt") return "text-orange-500"
  if (ext === "xlsx" || ext === "xls") return "text-emerald-600"
  if (ext === "md" || ext === "markdown") return "text-green-500"
  return "text-muted-foreground"
}

export default function TimelinePage() {
  useEffect(() => { document.title = "知识时间线 - AI Drive" }, [])
  const [files, setFiles] = useState<any[]>([])
  
  useEffect(() => {
    apiFetch("/api/files")
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.files || [])
        setFiles(list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      })
      .catch(() => {})
  }, [])

  // Group by date
  const groups: Record<string, any[]> = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  files.forEach(f => {
    const d = new Date(f.createdAt).toDateString()
    const label = d === today ? "今天" : d === yesterday ? "昨天" : new Date(f.createdAt).toLocaleDateString("zh-CN")
    if (!groups[label]) groups[label] = []
    groups[label].push(f)
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">📅 知识时间线</h1>
      <p className="text-sm text-muted-foreground mb-8">你的 AI 知识积累过程</p>
      
      {Object.entries(groups).length === 0 ? (
        <p className="text-center text-muted-foreground py-12">还没有上传文件</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-4">{date}</h2>
              <div className="border-l-2 border-border pl-6 space-y-4">
                {items.map((f: any) => (
                  <div key={f.id} className="relative">
                    <div className="absolute -left-[1.625rem] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-background" />
                    <Link href={`/files/${f.id}/preview`} className="block rounded-lg border p-4 hover:bg-accent/50 transition">
                      <div className="flex items-center gap-2">
                        <FileText className={`h-4 w-4 ${getFileColor(f.name || f.originalName || "")}`} />
                        <span className="font-medium text-sm">{f.name || f.originalName}</span>
                      </div>
                      {f.summary && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{f.summary.slice(0, 100)}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(f.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
