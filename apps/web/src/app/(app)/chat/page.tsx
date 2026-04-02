"use client"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ChatView } from "@/components/chat/chat-view"

function ChatPageInner() {
  const searchParams = useSearchParams()
  const fileId = searchParams.get("file")
  const fileName = searchParams.get("fileName")
  return <ChatView initialScope={fileId ? { type: "file", id: fileId, name: fileName || undefined } : undefined} />
}

export default function ChatPage() {
  return <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">加载中...</div>}>
    <ChatPageInner />
  </Suspense>
}
