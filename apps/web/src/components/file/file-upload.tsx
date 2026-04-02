"use client"
import { useState, useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface UploadItem { id: string; file: File; progress: number; status: "pending" | "uploading" | "confirming" | "done" | "error"; error?: string }

const ACCEPTED = { "application/pdf": [".pdf"], "text/plain": [".txt"], "text/markdown": [".md"] }
const MAX_SIZE = 50 * 1024 * 1024

async function uploadToS3(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => { xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)) }
    xhr.onerror = () => reject(new Error("Network error"))
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.send(file)
  })
}

export function FileUpload({ onClose }: { onClose: () => void }) {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const queryClient = useQueryClient()

  const processFile = useCallback(async (file: File) => {
    const itemId = crypto.randomUUID()
    setUploads((p) => [...p, { id: itemId, file, progress: 0, status: "pending" }])

    try {
      // 1. Get presigned URL
      setUploads((p) => p.map((u) => u.id === itemId ? { ...u, status: "uploading" } : u))
      const { uploadUrl, fileId } = await api.post<{ uploadUrl: string; fileId: string }>("/files/upload", {
        name: file.name, mimeType: file.type || "application/octet-stream", size: file.size,
      })

      // 2. Upload to S3 with progress
      await uploadToS3(uploadUrl, file, (pct) => {
        setUploads((p) => p.map((u) => u.id === itemId ? { ...u, progress: pct } : u))
      })

      // 3. Confirm
      setUploads((p) => p.map((u) => u.id === itemId ? { ...u, status: "confirming", progress: 100 } : u))
      await api.post(`/files/${fileId}/confirm`)

      setUploads((p) => p.map((u) => u.id === itemId ? { ...u, status: "done" } : u))
      queryClient.invalidateQueries({ queryKey: ["files"] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "上传失败"
      setUploads((p) => p.map((u) => u.id === itemId ? { ...u, status: "error", error: msg } : u))
      toast.error(`上传失败: ${file.name}`)
    }
  }, [queryClient])

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    accepted.forEach((file) => processFile(file))
    rejected.forEach((r) => {
      const msg = r.errors[0]?.code === "file-too-large" ? "文件超过 50MB 限制" : "不支持的文件格式"
      setUploads((p) => [...p, { id: crypto.randomUUID(), file: r.file, progress: 0, status: "error", error: msg }])
      toast.error(`${r.file.name}: ${msg}`)
    })
  }, [processFile])

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
        <div key={item.id} className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" /><span className="flex-1 truncate">{item.file.name}</span>
          {(item.status === "uploading" || item.status === "pending") && <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: item.progress + "%" }} /></div>}
          {item.status === "confirming" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {item.status === "error" && <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3.5 w-3.5" />{item.error}</span>}
        </div>))}</div>)}
    </div>
  )
}
