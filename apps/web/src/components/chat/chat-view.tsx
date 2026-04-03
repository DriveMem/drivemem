"use client"
import { useState, useCallback, useEffect, useRef } from "react"
import { MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { ScopeSelector, type ScopeValue } from "@/components/chat/scope-selector"
import { useConversation, useCreateConversation, type Message } from "@/hooks/use-api"
import { createSSEStream } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { useLayoutStore } from "@/stores/layout-store"
import { PanelLeft } from "lucide-react"

type ScopeType = "all" | "folder" | "file"

// Map API Message to ChatMessage format for MessageList
interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; createdAt: string
  citations?: { index: number; filename: string; snippet: string }[]
}

function toChat(msg: Message): ChatMessage {
  return { id: msg.id, role: msg.role, content: msg.content, createdAt: msg.createdAt, citations: msg.citations ?? undefined }
}

export function ChatView({ conversationId, initialScope }: { conversationId?: string; initialScope?: ScopeValue }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: convData, isLoading } = useConversation(conversationId || "")
  const createConversation = useCreateConversation()
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState<string | undefined>(undefined)
  const [scope, setScope] = useState<ScopeValue>(initialScope || { type: "all" })
  const [sending, setSending] = useState(false)
  const cancelRef = useRef<AbortController | null>(null)

  // Sync API messages to local state
  useEffect(() => {
    if (convData?.messages) {
      setLocalMessages(convData.messages.map(toChat))
    }
  }, [convData?.messages])

  const handleSend = useCallback(async (content: string) => {
    let chatId = conversationId

    // If no conversation yet, create one
    if (!chatId) {
      try {
        const conv = await createConversation.mutateAsync({ scope: scope.type !== "all" ? scope.type : undefined, scopeId: scope.id })
        chatId = conv.id
        router.push(`/chat/${chatId}`)
      } catch {
        toast.error("创建对话失败")
        return
      }
    }

    // Add user message locally
    const userMsg: ChatMessage = { id: "u-" + Date.now(), role: "user", content, createdAt: new Date().toISOString() }
    setLocalMessages((prev) => [...prev, userMsg])
    setSending(true)
    setStreaming("")

    let fullContent = ""

    // SSE stream
    cancelRef.current = createSSEStream(`/conversations/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
      onMessage: (data) => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === "token" || parsed.token) {
            const token = parsed.token || parsed.content || ""
            fullContent += token
            setStreaming(fullContent)
          } else if (parsed.type === "done" || parsed.done) {
            setStreaming(undefined)
            setSending(false)
            const assistantMsg: ChatMessage = {
              id: parsed.messageId || "a-" + Date.now(),
              role: "assistant",
              content: parsed.content || fullContent,
              createdAt: new Date().toISOString(),
              citations: parsed.citations,
            }
            setLocalMessages((prev) => [...prev, assistantMsg])
            queryClient.invalidateQueries({ queryKey: ["conversations"] })
            queryClient.invalidateQueries({ queryKey: ["conversations", chatId] })
          } else if (parsed.type === "error") {
            setStreaming(undefined)
            setSending(false)
            toast.error(parsed.message || "AI 回复出错")
          }
        } catch {
          // Plain text token
          fullContent += data
          setStreaming(fullContent)
        }
      },
      onError: (error) => {
        setStreaming(undefined)
        setSending(false)
        toast.error("连接中断: " + error.message)
      },
      onDone: () => {
        if (sending) {
          setStreaming(undefined)
          setSending(false)
          if (fullContent) {
            setLocalMessages((prev) => [...prev, {
              id: "a-" + Date.now(), role: "assistant", content: fullContent, createdAt: new Date().toISOString()
            }])
          }
        }
      },
    })
  }, [conversationId, scope, createConversation, router, queryClient, sending])

  if (isLoading && conversationId) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  // New chat — no conversation selected
  if (!conversationId && localMessages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <ScopeSelector value={scope} onChange={setScope} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <MessageSquare className="h-12 w-12" />
          <p className="text-lg">开始新对话</p>
          <p className="text-sm">输入问题，AI 将从你的文件中查找答案</p>
        </div>
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScopeSelector value={scope} onChange={setScope} />
      <MessageList messages={localMessages} streaming={streaming} />
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
