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
import { ConversationListSkeleton } from "@/components/skeletons/conversation-list-skeleton"
import { Loader2, Pin, Search, MessageSquare } from "lucide-react"

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

  const groups = (() => {
    const pinned = sorted.filter((c: Conversation) => c.isPinned)
    const unpinned = sorted.filter((c: Conversation) => !c.isPinned)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 86400000
    const weekStart = todayStart - 6 * 86400000

    const result: { label: string; items: Conversation[] }[] = []

    if (pinned.length > 0) {
      result.push({ label: "📌 置顶", items: pinned })
    }

    const timeGroups: { label: string; items: Conversation[] }[] = [
      { label: "今天", items: [] },
      { label: "昨天", items: [] },
      { label: "过去 7 天", items: [] },
      { label: "更早", items: [] },
    ]

    for (const c of unpinned) {
      const t = new Date(c.updatedAt).getTime()
      if (t >= todayStart) timeGroups[0].items.push(c)
      else if (t >= yesterdayStart) timeGroups[1].items.push(c)
      else if (t >= weekStart) timeGroups[2].items.push(c)
      else timeGroups[3].items.push(c)
    }

    result.push(...timeGroups.filter((g) => g.items.length > 0))
    return result
  })()

  const renderItem = (c: Conversation) => (
    <li
      key={c.id}
      className={`group flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-accent ${
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
        <p className="text-xs text-muted-foreground">{formatTime(c.updatedAt)}</p>
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
  )

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">对话历史</h2>
        <Button size="sm" variant="outline" onClick={() => router.push("/chat?new=" + Date.now())}>
          + 新对话
        </Button>
      </div>
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full rounded-md bg-muted/50 pl-8 pr-3 py-1.5 text-xs outline-none placeholder-muted-foreground"
          />
        </div>
      </div>

      {isLoading ? (
        <ConversationListSkeleton />
      ) : sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">💬 开始第一次 AI 对话</p>
          <p className="text-xs text-muted-foreground">上传文件后，与 AI 一起分析</p>
          <Button size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push("/chat?new=" + Date.now())}>
            新建对话
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {groups.map((group, idx) => (
            <div key={group.label}>
              {group.label === "📌 置顶" && idx === 0 && groups.length > 1 ? (
                <>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-2">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map((c) => renderItem(c))}
                  </ul>
                  <div className="border-b border-border mx-3 my-1" />
                </>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide px-3 py-2">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map((c) => renderItem(c))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
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
              {deleteMutation.isPending ? "删除中..." : "确定删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
