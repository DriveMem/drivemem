"use client"
import { useState, useCallback, useEffect } from "react"
import { MessageSquare, FileText, Folder, Files } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { useFiles } from "@/hooks/use-files"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { getSession } from "next-auth/react"
import { useConversation } from "@/hooks/use-conversations"
import { useQueryClient } from "@tanstack/react-query"

type ScopeType = "all" | "folder" | "file"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  citations?: Array<{ fileId: string; fileName: string; chunkIndex: number; text: string }>
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

export function ChatView({ conversationId: initialConversationId, fileScope, presetQuestion }: { conversationId?: string; fileScope?: string; presetQuestion?: string }) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState<string | undefined>(undefined)
  const [scope, setScope] = useState<ScopeType>(fileScope ? "file" : "all")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: filesData } = useFiles()
  const hasFiles = Array.isArray(filesData) ? filesData.length > 0 : (filesData?.files?.length ?? 0) > 0

  // Load history messages for existing conversation
  const { data: convData } = useConversation(initialConversationId || "")
  const [historyLoaded, setHistoryLoaded] = useState(false)
  useEffect(() => {
    if (convData?.messages && !historyLoaded) {
      const loaded: ChatMessage[] = convData.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        citations: m.citations || [],
      }))
      setMessages(loaded)
      setHistoryLoaded(true)
    }
  }, [convData, historyLoaded])


  const handleSend = useCallback(async (content: string) => {
    setError(null)
    const userMsg: ChatMessage = { id: "u-" + Date.now(), role: "user", content, createdAt: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)
    setStreaming("")

    try {
      // Create conversation if needed
      let convId = conversationId
      if (!convId) {
        const conv = await apiFetch("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ scopeType: scope, scopeId: fileScope || undefined }),
        })
        convId = conv.id
        setConversationId(convId)
        // Refresh conversation list in sidebar
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
      }

      // Get session token for Bearer auth
      const session = await getSession()
      const token = (session as any)?.accessToken

      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      // Send message with SSE
      const res = await fetch(`${API_BASE}/api/conversations/${convId}/messages`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ content }),
      })

      if (res.status === 429) {
        setError("今天的对话次数已用完，明天再来")
        setStreaming(undefined)
        setSending(false)
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || "发送失败")
      }

      // Parse SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""
      let assistantCitations: any[] = []

      if (!reader) throw new Error("No reader")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content !== undefined) {
                fullContent += data.content
                setStreaming(fullContent)
              } else if (data.messageId) {
                assistantCitations = data.citations || []
              } else if (data.code) {
                setError(data.message || "生成失败")
              }
            } catch {}
          }
        }
      }

      setStreaming(undefined)
      setSending(false)
      const assistantMsg: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: fullContent,
        createdAt: new Date().toISOString(),
        citations: assistantCitations,
      }
      setMessages((prev) => [...prev, assistantMsg])
      // Refresh conversation list (title may have been auto-generated)
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    } catch (err: any) {
      setError(err.message || "网络错误")
      setStreaming(undefined)
      setSending(false)
    }
  }, [conversationId, scope])

  // Auto-send preset question (from first upload guide)
  const [presetSent, setPresetSent] = useState(false)
  useEffect(() => {
    if (presetQuestion && !presetSent && hasFiles && !sending) {
      setPresetSent(true)
      setTimeout(() => handleSend(presetQuestion), 500)
    }
  }, [presetQuestion, presetSent, hasFiles, sending, handleSend])

  if (!hasFiles) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <MessageSquare className="h-12 w-12" />
        <p className="text-lg">你还没有让 AI 记住任何文件</p>
        <Button asChild><Link href="/dashboard">去上传文件</Link></Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Scope selector */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">AI 记忆范围：</span>
        {([["all", "全部文件", Files], ["folder", "指定文件夹", Folder], ["file", "指定文件", FileText]] as const).map(([type, label, Icon]) => (
          <Button key={type} variant={scope === type ? "secondary" : "ghost"} size="sm" onClick={() => setScope(type)} className="gap-1 text-xs">
            <Icon className="h-3 w-3" />{label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-b border-border">
          {error}
        </div>
      )}

      <MessageList messages={messages} streaming={streaming} />
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
