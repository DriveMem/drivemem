"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ChatView } from "@/components/chat/chat-view"

function ChatPageInner() {
  const searchParams = useSearchParams()
  const fileId = searchParams.get("file") || undefined
  return <ChatView fileScope={fileId} />
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">加载中...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
