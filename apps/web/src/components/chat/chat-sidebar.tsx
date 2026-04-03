"use client"
import { useState, useEffect } from "react"
import { Plus, PanelLeftClose, PanelLeft, MessageSquare, Loader2, X, History } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useConversations, useCreateConversation } from "@/hooks/use-api"
import { useLayoutStore } from "@/stores/layout-store"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

function formatTime(iso: string, mounted: boolean) {
  if (!mounted) return ""
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  if (diff < 604800000) return d.toLocaleDateString("zh-CN", { weekday: "short" })
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

function ConversationList({ onSelect }: { onSelect?: () => void }) {
  const params = useParams()
  const router = useRouter()
  const activeId = params?.id as string | undefined
  const { data: conversations, isLoading } = useConversations()
  const createConversation = useCreateConversation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  async function handleNew() {
    try {
      const conv = await createConversation.mutateAsync({})
      router.push(`/chat/${conv.id}`)
      onSelect?.()
    } catch { /* toast handled by mutation */ }
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">对话历史</span>
        <Button variant="ghost" size="icon" onClick={handleNew} disabled={createConversation.isPending} className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
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
            <Link key={conv.id} href={`/chat/${conv.id}`} onClick={onSelect}
              className={cn("flex flex-col gap-0.5 px-3 py-2 text-sm hover:bg-accent rounded-md mx-1", activeId === conv.id && "bg-accent")}>
              <span className="truncate font-medium">{conv.title || "新对话"}</span>
              <span className="text-xs text-muted-foreground">{formatTime(conv.updatedAt || conv.createdAt, mounted)}</span>
            </Link>
          ))
        )}
      </div>
    </>
  )
}

export function ChatSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { mobileChatSidebarOpen, setMobileChatSidebarOpen } = useLayoutStore()

  if (collapsed) {
    return (
      <div className="hidden md:flex flex-col items-center py-2 border-r border-border w-12">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="h-8 w-8 mb-2"><PanelLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
      </div>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full w-64 flex-col border-r border-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-medium">对话历史</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} className="h-7 w-7"><PanelLeftClose className="h-4 w-4" /></Button>
          </div>
        </div>
        <ConversationList />
      </div>

      {/* Mobile toggle button — rendered inline in chat area */}
      <div className="md:hidden absolute top-2 left-2 z-10">
        <Button variant="outline" size="icon" onClick={() => setMobileChatSidebarOpen(true)} className="h-8 w-8"><History className="h-4 w-4" /></Button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileChatSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileChatSidebarOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.2 }} className="relative h-full w-[280px] bg-background border-r border-border flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-medium">对话历史</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileChatSidebarOpen(false)} className="h-7 w-7"><X className="h-4 w-4" /></Button>
              </div>
              <ConversationList onSelect={() => setMobileChatSidebarOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
