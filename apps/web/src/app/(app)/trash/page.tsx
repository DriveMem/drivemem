"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { Trash2, RotateCcw, Loader2 } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

interface TrashedFile {
  id: string
  name: string
  size: number
  deletedAt: string
}

function daysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime()
  const now = Date.now()
  const elapsed = Math.floor((now - deleted) / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - elapsed)
}

export default function TrashPage() {
  useEffect(() => { document.title = "回收站 - DriveMem" }, [])
  const [files, setFiles] = useState<TrashedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchTrash = useCallback(async () => {
    try {
      const data = await apiFetch("/api/trash")
      setFiles(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTrash() }, [fetchTrash])

  const restore = async (id: string) => {
    setActionLoading(id + "-restore")
    try {
      await apiFetch(`/api/trash/${id}/restore`, { method: "POST" })
      setFiles(f => f.filter(x => x.id !== id))
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const permanentDelete = async (id: string) => {
    setActionLoading(id + "-delete")
    try {
      await apiFetch(`/api/trash/${id}`, { method: "DELETE" })
      setFiles(f => f.filter(x => x.id !== id))
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const emptyTrash = async () => {
    setActionLoading("empty")
    try {
      await apiFetch("/api/trash", { method: "DELETE" })
      setFiles([])
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🗑️ 回收站</h1>
        {files.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={emptyTrash}
            disabled={actionLoading === "empty"}
          >
            {actionLoading === "empty" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            清空回收站
          </Button>
        )}
      </div>

      {files.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="h-12 w-12" />}
          title="回收站为空"
          description="删除的文件会在此保留 30 天"
        />
      ) : (
        <div className="space-y-2">
          {files.map(file => {
            const remaining = daysRemaining(file.deletedAt)
            return (
              <div key={file.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    删除于 {new Date(file.deletedAt).toLocaleDateString("zh-CN")} · 剩余 {remaining} 天
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restore(file.id)}
                    disabled={actionLoading === file.id + "-restore"}
                  >
                    {actionLoading === file.id + "-restore" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                    恢复
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => permanentDelete(file.id)}
                    disabled={actionLoading === file.id + "-delete"}
                  >
                    {actionLoading === file.id + "-delete" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                    永久删除
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
