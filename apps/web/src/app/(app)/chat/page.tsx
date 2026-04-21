"use client"
import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ChatView } from "@/components/chat/chat-view"
import { useConversations, useRecentConversations } from "@/hooks/use-conversations"
import { ChatSkeleton } from "@/components/ui/skeleton-loader"
import { MessageCircle, Clock, Pin } from "lucide-react"
import Link from "next/link"

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function RecentConversationsSidebar() {
  const { data, isLoading } = useRecentConversations(10)
  const conversations = data?.conversations || []

  if (isLoading || conversations.length === 0) return null

  return (
    <div className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 h-full overflow-y-auto hidden lg:block">
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Recent Chats</span>
        </div>
        <div className="space-y-0.5">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className="block px-2 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition group"
            >
              <div className="flex items-center gap-1.5">
                {conv.isPinned && <Pin className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate font-medium">
                  {conv.title}
                </span>
              </div>
              {conv.previewSnippet && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {conv.previewSnippet}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                <span>{conv.messageCount} msgs</span>
                <span>·</span>
                <span>{relativeTime(conv.lastMessageAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatPageInner() {
  useEffect(() => { document.title = "Chat — DriveMem" }, [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const fileId = searchParams.get("file") || undefined
  const fileIds = searchParams.get("fileIds") || undefined
  const presetQuestion = searchParams.get("q") || undefined
  const compareMode = searchParams.get("mode") === "compare"
  const fileA = searchParams.get("fileA") || undefined
  const fileB = searchParams.get("fileB") || undefined
  const isNewChat = !!searchParams.get("new")
  const { data: convsData, isLoading } = useConversations()

  useEffect(() => {
    if (isLoading || fileId || fileIds || presetQuestion || isNewChat) return
    const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
    if (convs.length > 0 && convs[0].id) {
      router.replace("/chat/" + convs[0].id)
    }
  }, [convsData, isLoading, fileId, fileIds, presetQuestion, isNewChat, router])

  const resolvedFileScope = fileIds ? `files:${fileIds}` : fileId
  const chatKey = searchParams.get("new") || resolvedFileScope || "default"
  return <ChatView key={chatKey} fileScope={resolvedFileScope} presetQuestion={presetQuestion} compareMode={compareMode} fileA={fileA} fileB={fileB} />
}

export default function ChatPage() {
  return (
    <div className="h-full page-enter flex">
      <RecentConversationsSidebar />
      <div className="flex-1 h-full min-w-0">
        <Suspense fallback={<ChatSkeleton />}>
          <ChatPageInner />
        </Suspense>
      </div>
    </div>
  )
}
