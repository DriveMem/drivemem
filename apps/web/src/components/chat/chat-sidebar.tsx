"use client"
import { useState } from "react"
import { Plus, PanelLeftClose, PanelLeft, MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useConversations, useCreateConversation } from "@/hooks/use-api"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  if (diff < 604800000) return d.toLocaleDateString("zh-CN", { weekday: "short" })
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

export function ChatSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const params = useParams()
  const router = useRouter()
  const activeId = params?.id as string | undefined
  const { data: conversations, isLoading } = useConversations()
  const createConversation = useCreateConversation()

  async function handleNew() {
    try {
      const conv = await createConversation.mutateAsync({})
      router.push(`/chat/${conv.id}`)
    } catch { /* toast handled by mutation */ }
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2 border-r border-border w-12">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="h-8 w-8 mb-2"><PanelLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={handleNew} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">对话历史</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleNew} disabled={createConversation.isPending} className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} className="h-7 w-7"><PanelLeftClose className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2 px-4">
            <MessageSquare className="h-8 w-8" /><p>还没有对话</p>
            <Button size="sm" variant="outline" onClick={handleNew}>开始新对话</Button>
          </div>
        ) : (
          conversations.map((conv) => (
            <Link key={conv.id} href={`/chat/${conv.id}`}
              className={cn("flex flex-col gap-0.5 px-3 py-2 text-sm hover:bg-accent rounded-md mx-1", activeId === conv.id && "bg-accent")}>
              <span className="truncate font-medium">{conv.title || "新对话"}</span>
              <span className="text-xs text-muted-foreground">{formatTime(conv.updatedAt || conv.createdAt)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
