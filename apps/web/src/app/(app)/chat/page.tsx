"use client"
import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ChatView } from "@/components/chat/chat-view"
import { useConversations } from "@/hooks/use-conversations"

function ChatPageInner() {
  useEffect(() => { document.title = "对话 - AI Drive" }, [])
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
    <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">加载中...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
