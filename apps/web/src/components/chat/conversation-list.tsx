"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Conversation {
  id: string
  title: string
  updatedAt: string
}

const mockConversations: Conversation[] = [
  { id: "c1", title: "关于产品需求文档的讨论", updatedAt: "2026-03-31T18:00:00Z" },
  { id: "c2", title: "LLM 论文笔记要点", updatedAt: "2026-03-30T14:00:00Z" },
  { id: "c3", title: "技术方案总结", updatedAt: "2026-03-29T10:00:00Z" },
  { id: "c4", title: "周报整理", updatedAt: "2026-03-28T09:00:00Z" },
]

export function ConversationList({
  activeId,
  onSelect,
}: {
  activeId?: string
  onSelect: (id: string | null) => void
}) {
  const [conversations, setConversations] = useState(mockConversations)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = () => {
    if (deleteTarget) {
      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget))
      if (activeId === deleteTarget) onSelect(null)
      setDeleteTarget(null)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">对话历史</h2>
        <Button size="sm" variant="outline" onClick={() => onSelect(null)}>
          + 新对话
        </Button>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <li
            key={c.id}
            className={`group flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-accent ${
              activeId === c.id ? "bg-accent" : ""
            }`}
            onClick={() => onSelect(c.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.title}</p>
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

      {/* Delete confirm dialog */}
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
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
