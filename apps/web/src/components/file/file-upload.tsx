"use client"
import { useState, useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
interface UploadItem { id: string; file: File; progress: number; status: "pending" | "uploading" | "done" | "error"; error?: string }
const ACCEPTED = { "application/pdf": [".pdf"], "text/plain": [".txt"], "text/markdown": [".md"] }
const MAX_SIZE = 50 * 1024 * 1024
export function FileUpload({ onClose }: { onClose: () => void }) {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    const items: UploadItem[] = accepted.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: "pending" as const }))
    items.forEach((item) => {
      setTimeout(() => { setUploads((p) => p.map((u) => u.id === item.id ? { ...u, status: "uploading" as const, progress: 30 } : u))
        setTimeout(() => { setUploads((p) => p.map((u) => u.id === item.id ? { ...u, progress: 70 } : u))
          setTimeout(() => { setUploads((p) => p.map((u) => u.id === item.id ? { ...u, status: "done" as const, progress: 100 } : u)) }, 500)
        }, 500)
      }, 200)
    })
    setUploads((p) => [...p, ...items])
    rejected.forEach((r) => {
      const msg = r.errors[0]?.code === "file-too-large" ? "文件超过 50MB 限制" : "不支持的文件格式"
      setUploads((p) => [...p, { id: crypto.randomUUID(), file: r.file, progress: 0, status: "error" as const, error: msg }])
    })
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, maxSize: MAX_SIZE })
  return (
    <div className="border-b border-border p-4">
      <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium">上传文件</span><Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X className="h-4 w-4" /></Button></div>
      <div {...getRootProps()} className={cn("flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors", isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
        <input {...getInputProps()} /><Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{isDragActive ? "松手上传" : "把文件拖到这里，让 AI 记住它"}</p>
        <p className="text-xs text-muted-foreground mt-1">支持 PDF、TXT、Markdown，最大 50MB</p>
      </div>
      {uploads.length > 0 && (<div className="mt-3 space-y-2">{uploads.map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" /><span className="flex-1 truncate">{item.file.name}</span>
          {item.status === "uploading" && <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: item.progress + "%" }} /></div>}
          {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {item.status === "error" && <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3.5 w-3.5" />{item.error}</span>}
        </div>))}</div>)}
    </div>
  )
}
