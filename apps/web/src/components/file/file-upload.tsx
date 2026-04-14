"use client"

import { useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUploadFile } from "@/hooks/use-files"
import { useUploadStore } from "@/lib/stores/upload-store"
import { toast } from "sonner"

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
  const uploadFile = useUploadFile()
  const { addEntry, updateEntry } = useUploadStore()
  const currentFolderId = folderId ?? null

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    // Add rejected files with error to the global upload store
    rejected.forEach((r) => {
      const msg = r.errors[0]?.code === "file-too-large" ? "FilesExceeds 50MB limit" : "Unsupported file format"
      addEntry({ id: crypto.randomUUID(), name: r.file.name, progress: 0, status: "error", error: msg })
    })

    // Upload accepted files with progress tracking via global store
    accepted.forEach((file) => {
      const itemId = crypto.randomUUID()
      addEntry({ id: itemId, name: file.name, progress: 0, status: "uploading" })

      uploadFile.mutate(
        { file, folderId: currentFolderId, onProgress: (pct: number) => {
          updateEntry(itemId, { progress: pct })
        }},
        {
          onSuccess: () => {
            updateEntry(itemId, { status: "done", progress: 100 })
          },
          onError: (err: any) => {
            updateEntry(itemId, { status: "error", error: err.message || "UploadFailed" })
          },
        }
      )
    })

    // Close dialog immediately — progress is now visible in the floating widget
    if (accepted.length > 0) {
      onClose()
    }
  }, [uploadFile, currentFolderId, addEntry, updateEntry])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, maxSize: MAX_SIZE })

  return (
    <div className="border-b border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Let AI remember files</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X className="h-4 w-4" /></Button>
      </div>
      <div {...getRootProps()} className={cn("flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors", isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{isDragActive ? "Release to let AI remember" : "Drag files here to let AI remember them"}</p>
        <p className="text-xs text-muted-foreground mt-1">Supports PDF, Word, PPT, Excel, TXT, Markdown, max 50MB per file</p>
      </div>
    </div>
  )
}
