"use client"

import { useEffect } from "react"
import { X, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { useUploadStore, type UploadEntry } from "@/lib/stores/upload-store"
import { cn } from "@/lib/utils"

function EntryRow({ entry }: { entry: UploadEntry }) {
  const { removeEntry } = useUploadStore()

  // Auto-remove successful entries after 3s
  useEffect(() => {
    if (entry.status === "done") {
      const t = setTimeout(() => removeEntry(entry.id), 3000)
      return () => clearTimeout(t)
    }
  }, [entry.status, entry.id, removeEntry])

  return (
    <div className="flex items-center gap-2 text-sm">
      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate max-w-[180px]">{entry.name}</span>
      {entry.status === "uploading" && (
        <>
          <span className="text-xs text-muted-foreground tabular-nums">{entry.progress}%</span>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </>
      )}
      {entry.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      {entry.status === "error" && (
        <>
          <span className="text-xs text-red-500 truncate max-w-[100px]">{entry.error}</span>
          <button onClick={() => removeEntry(entry.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      {entry.status === "uploading" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${entry.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function UploadProgress() {
  const entries = useUploadStore((s) => s.entries)

  if (entries.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border bg-background shadow-lg">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Uploading</span>
        <span className="text-xs text-muted-foreground">{entries.filter((e) => e.status === "uploading").length}  files</span>
      </div>
      <div className="px-3 py-2 space-y-2 max-h-48 overflow-y-auto">
        {entries.map((entry) => (
          <div key={entry.id} className="relative">
            <EntryRow entry={entry} />
          </div>
        ))}
      </div>
    </div>
  )
}
