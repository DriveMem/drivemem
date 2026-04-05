"use client"

import { useState, useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUploadFile } from "@/hooks/use-files"
import { toast } from "sonner"

interface UploadItem { id: string; name: string; progress: number; status: "pending" | "uploading" | "done" | "error"; error?: string }

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
}
const MAX_SIZE = 50 * 1024 * 1024

export function FileUpload({ onClose, folderId }: { onClose: () => void; folderId?: string | null }) {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const uploadFile = useUploadFile()
  const currentFolderId = folderId ?? null

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    // Add rejected files with error
    rejected.forEach((r) => {
      const msg = r.errors[0]?.code === "file-too-large" ? "文件超过 50MB 限制" : "不支持的文件格式"
      setUploads((p) => [...p, { id: crypto.randomUUID(), name: r.file.name, progress: 0, status: "error" as const, error: msg }])
    })

    // Upload accepted files
    accepted.forEach((file) => {
      const itemId = crypto.randomUUID()
      setUploads((p) => [...p, { id: itemId, name: file.name, progress: 0, status: "uploading" as const }])

      uploadFile.mutate(
        { file, folderId: currentFolderId, onProgress: (pct: number) => {
          setUploads((p) => p.map((u) => u.id === itemId ? { ...u, progress: pct } : u))
        }},
        {
          onSuccess: () => {
            setUploads((p) => p.map((u) => u.id === itemId ? { ...u, status: "done" as const, progress: 100 } : u))
            toast.success(`${file.name} 已添加到 AI 知识库`, { duration: 4000 })
          },
          onError: (err: any) => {
            setUploads((p) => p.map((u) => u.id === itemId ? { ...u, status: "error" as const, error: err.message || "记住失败" } : u))
            toast.error(`${file.name} 上传失败: ${err.message || "未知错误"}`, { duration: 5000 })
          },
        }
      )
    })

    // Auto-close modal and show toast after uploads start
    if (accepted.length > 0) {
      toast("正在让 AI 记住...", { duration: 3000 })
      onClose()
    }
  }, [uploadFile, currentFolderId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, maxSize: MAX_SIZE })

  return (
    <div className="border-b border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">让 AI 记住文件</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X className="h-4 w-4" /></Button>
      </div>
      <div {...getRootProps()} className={cn("flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors", isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{isDragActive ? "松手让 AI 记住" : "把文件拖到这里，让 AI 记住它"}</p>
        <p className="text-xs text-muted-foreground mt-1">支持 PDF、Word、PPT、Excel、TXT、Markdown，单个文件最大 50MB</p>
      </div>
      {uploads.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploads.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{item.name}</span>
              {item.status === "uploading" && <span className="text-xs text-muted-foreground">{item.progress}%</span>}
              {item.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {item.status === "error" && <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3.5 w-3.5" />{item.error}</span>}
              </div>
              {item.status === "uploading" && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
