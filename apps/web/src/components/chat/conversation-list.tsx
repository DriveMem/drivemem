"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConversations, useDeleteConversation } from "@/hooks/use-conversations"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Loader2, Pin, Search, MessageCircle } from "lucide-react"

interface Conversation {
  id: string
  title: string
  updatedAt: string
  isPinned?: boolean
}

export function ConversationList() {
  const router = useRouter()
  const params = useParams()
  const activeId = params?.id as string | undefined

  const { data: conversations, isLoading } = useConversations()
  const deleteMutation = useDeleteConversation()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

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
    const s = [...list].sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    if (!searchQuery.trim()) return s
    return s.filter((c: Conversation) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
  })()

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">对话历史</h2>
      </div>
      <div className="px-3 pt-3">
        <Button className="w-full bg-[#4F5BD5] hover:bg-[#3D49C4] text-white rounded-lg py-2.5 text-sm font-medium" onClick={() => router.push("/chat?new=" + Date.now())}>
          + 新对话
        </Button>
      </div>
      <div className="px-3 py-2 border-b">
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full bg-transparent text-xs outline-none placeholder-muted-foreground"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="rounded-full bg-[#4F5BD5]/10 p-3">
            <MessageCircle className="h-5 w-5 text-[#4F5BD5]" />
          </div>
          <p className="text-sm text-muted-foreground">还没有对话</p>
          <p className="text-xs text-muted-foreground/60">点击上方按钮开始第一次 AI 对话</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {(() => {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
            const yesterday = today - 86400000
            const weekAgo = today - 7 * 86400000

            const groups: { label: string; items: Conversation[] }[] = [
              { label: "今天", items: [] },
              { label: "昨天", items: [] },
              { label: "本周", items: [] },
              { label: "更早", items: [] },
            ]

            sorted.forEach((c: Conversation) => {
              const t = new Date(c.updatedAt).getTime()
              if (t >= today) groups[0].items.push(c)
              else if (t >= yesterday) groups[1].items.push(c)
              else if (t >= weekAgo) groups[2].items.push(c)
              else groups[3].items.push(c)
            })

            return groups.filter(g => g.items.length > 0).map(g => (
              <li key={g.label}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{g.label}</p>
                {g.items.map((c: Conversation) => (
            <li
              key={c.id}
              className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-accent ${
                activeId === c.id ? "bg-accent" : ""
              }`}
              onClick={() => router.push(`/chat/${c.id}`)}
            >
              <div className="min-w-0 flex-1">
                {editingId === c.id ? (
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const trimmed = editValue.trim()
                        if (trimmed && trimmed !== c.title) {
                          apiFetch(`/api/conversations/${c.id}`, { method: "PATCH", body: JSON.stringify({ title: trimmed }) })
                        }
                        setEditingId(null)
                      } else if (e.key === "Escape") {
                        setEditingId(null)
                      }
                    }}
                    onBlur={() => {
                      const trimmed = editValue.trim()
                      if (trimmed && trimmed !== c.title) {
                        apiFetch(`/api/conversations/${c.id}`, { method: "PATCH", body: JSON.stringify({ title: trimmed }) })
                      }
                      setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none"
                  />
                ) : (
                  <p
                    className="truncate text-sm font-medium"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingId(c.id)
                      setEditValue(c.title || "新对话")
                    }}
                  >{c.title || "新对话"}</p>
                )}
                <p className="text-xs text-muted-foreground truncate mt-0.5">{formatTime(c.updatedAt)}</p>
              </div>
              {c.isPinned && <Pin className="h-3 w-3 text-blue-400 shrink-0" />}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  apiFetch(`/api/conversations/${c.id}`, { method: "PATCH", body: JSON.stringify({ isPinned: !c.isPinned }) })
                    .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
                }}
              >
                <Pin className={`h-3 w-3 ${c.isPinned ? "text-blue-400" : ""}`} />
              </Button>
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
              </li>
            ))
          })()}
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
