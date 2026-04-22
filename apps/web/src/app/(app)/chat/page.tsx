"use client"
import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ChatView } from "@/components/chat/chat-view"
import { useConversations } from "@/hooks/use-conversations"
import { ChatSkeleton } from "@/components/ui/skeleton-loader"

function ChatPageInner() {
  useEffect(() => { document.title = "Chat — DriveMem" }, [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const fileId = searchParams.get("file") || undefined
  const fileIds = searchParams.get("fileIds") || undefined
  const folderId = searchParams.get("folderId") || undefined
  const presetQuestion = searchParams.get("q") || undefined
  const compareMode = searchParams.get("mode") === "compare"
  const fileA = searchParams.get("fileA") || undefined
  const fileB = searchParams.get("fileB") || undefined
  const isNewChat = !!searchParams.get("new")
  const { data: convsData, isLoading } = useConversations()

  useEffect(() => {
    if (isLoading || fileId || fileIds || folderId || presetQuestion || isNewChat) return
    const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
    if (convs.length > 0 && convs[0].id) {
      router.replace("/chat/" + convs[0].id)
    }
  }, [convsData, isLoading, fileId, fileIds, folderId, presetQuestion, isNewChat, router])

  const resolvedFileScope = fileIds ? `files:${fileIds}` : fileId
  const chatKey = searchParams.get("new") || resolvedFileScope || folderId || "default"
  return <ChatView key={chatKey} fileScope={resolvedFileScope} folderScope={folderId} presetQuestion={presetQuestion} compareMode={compareMode} fileA={fileA} fileB={fileB} />
}

export default function ChatPage() {
  return (
    <div className="h-full page-enter flex">
      <div className="flex-1 h-full min-w-0">
        <Suspense fallback={<ChatSkeleton />}>
          <ChatPageInner />
        </Suspense>
      </div>
    </div>
  )
}
