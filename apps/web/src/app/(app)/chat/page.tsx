"use client"
import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ChatView } from "@/components/chat/chat-view"
import { useConversations } from "@/hooks/use-conversations"

function ChatPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fileId = searchParams.get("file") || undefined
  const presetQuestion = searchParams.get("q") || undefined
  const compareMode = searchParams.get("mode") === "compare"
  const fileA = searchParams.get("fileA") || undefined
  const fileB = searchParams.get("fileB") || undefined
  const { data: convsData, isLoading } = useConversations()

  useEffect(() => {
    if (isLoading || fileId || presetQuestion) return
    const convs = Array.isArray(convsData) ? convsData : (convsData?.conversations || [])
    if (convs.length > 0 && convs[0].id) {
      router.replace("/chat/" + convs[0].id)
    }
  }, [convsData, isLoading, fileId, presetQuestion, router])

  return <ChatView fileScope={fileId} presetQuestion={presetQuestion} compareMode={compareMode} fileA={fileA} fileB={fileB} />
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">加载中...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
