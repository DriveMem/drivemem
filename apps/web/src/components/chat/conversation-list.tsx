"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConversations, useDeleteConversation } from "@/hooks/use-conversations"
import { Loader2 } from "lucide-react"

interface Conversation {
  id: string
  title: string
  updatedAt: string
}

export function ConversationList() {
  const router = useRouter()
  const params = useParams()
  const activeId = params?.id as string | undefined

  const { data: conversations, isLoading } = useConversations()
  const deleteMutation = useDeleteConversation()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget, {
        onSuccess: () => {
          if (activeId === deleteTarget) router.push("/chat")
          setDeleteTarget(null)
        },
      })
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

    const sorted = (() => {
    const list = Array.isArray(conversations) ? conversations : (conversations?.conversations || [])
    return [...list].sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  })()

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">对话历史</h2>
        <Button size="sm" variant="outline" onClick={() => router.push("/chat")}>
          + 新对话
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">暂无对话</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {sorted.map((c: Conversation) => (
            <li
              key={c.id}
              className={`group flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-accent ${
                activeId === c.id ? "bg-accent" : ""
              }`}
              onClick={() => router.push(`/chat/${c.id}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title || "新对话"}</p>
                <p className="text-xs text-muted-foreground">{formatTime(c.updatedAt)}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget(c.id)
                }}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除对话</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确定要删除这个对话吗？此操作不可撤销。</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "删除中..." : "删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
