"use client"
import { useState, useCallback } from "react"
import { MessageSquare, FileText, Folder, Files } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { mockMessages, mockSSEStream, type ChatMessage } from "@/lib/mock-chat"
import { mockFiles } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import Link from "next/link"

type ScopeType = "all" | "folder" | "file"

export function ChatView({ conversationId }: { conversationId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(conversationId ? (mockMessages[conversationId] ?? []) : [])
  const [streaming, setStreaming] = useState<string | undefined>(undefined)
  const [scope, setScope] = useState<ScopeType>("all")
  const [sending, setSending] = useState(false)

  const hasFiles = mockFiles.length > 0

  const handleSend = useCallback((content: string) => {
    const userMsg: ChatMessage = { id: "u-" + Date.now(), role: "user", content, createdAt: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)
    setStreaming("")

    const cancel = mockSSEStream(content,
      (token) => setStreaming((prev) => (prev ?? "") + token),
      (citations) => {
        setStreaming(undefined)
        setSending(false)
        const assistantMsg: ChatMessage = {
          id: "a-" + Date.now(), role: "assistant",
          content: "这是一个模拟的 AI 回复。你的问题是：" + content.slice(0, 20) + "...\n\n让我帮你分析相关内容 [1]。",
          createdAt: new Date().toISOString(), citations,
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    )
    return () => cancel()
  }, [])

  if (!hasFiles) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <MessageSquare className="h-12 w-12" />
        <p className="text-lg">你还没有让 AI 记住任何文件</p>
        <Button asChild><Link href="/">去上传文件</Link></Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Scope selector */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">对话范围：</span>
        {([["all", "全部文件", Files], ["folder", "指定文件夹", Folder], ["file", "指定文件", FileText]] as const).map(([type, label, Icon]) => (
          <Button key={type} variant={scope === type ? "secondary" : "ghost"} size="sm" onClick={() => setScope(type)} className="gap-1 text-xs">
            <Icon className="h-3 w-3" />{label}
          </Button>
        ))}
      </div>

      <MessageList messages={messages} streaming={streaming} />
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
