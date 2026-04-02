"use client"
import { useState, useCallback, useEffect } from "react"
import { MessageSquare, FileText, Folder, Files, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { useFiles } from "@/hooks/use-files"
import { useFolders } from "@/hooks/use-folders"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
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
  const [scopeId, setScopeId] = useState<string | undefined>(fileScope || undefined)
  const [scopeLabel, setScopeLabel] = useState<string | undefined>(undefined)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: filesData } = useFiles()
  const filesList = Array.isArray(filesData) ? filesData : (filesData?.files || [])
  const indexedCount = filesList.filter((f: any) => f.status === "indexed").length
  const indexedFiles = filesList.filter((f: any) => f.status === "indexed")
  const hasFiles = filesList.length > 0

  const { data: foldersData } = useFolders()
  const foldersList = foldersData?.folders || []

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
          body: JSON.stringify({ scopeType: scope, scopeId: scopeId || undefined }),
        })
        convId = conv.id
        setConversationId(convId)
        // Optimistically set temp title in query cache
        const tempTitle = content.slice(0, 20) + (content.length > 20 ? "..." : "")
        queryClient.setQueryData(["conversations"], (old: any) => {
          const newConv = { id: convId, title: tempTitle, updatedAt: new Date().toISOString() }
          if (!old) return { conversations: [newConv] }
          if (Array.isArray(old)) return [newConv, ...old]
          const list = old?.conversations || []
          return { ...old, conversations: [newConv, ...list] }
        })
        // Also refresh from server
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
  }, [conversationId, scope, scopeId])

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
        <Button variant={scope === "all" ? "secondary" : "ghost"} size="sm" onClick={() => { setScope("all"); setScopeId(undefined); setScopeLabel(undefined) }} className="gap-1 text-xs">
          <Files className="h-3 w-3" />全部文件
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={scope === "folder" ? "secondary" : "ghost"} size="sm" className="gap-1 text-xs">
              <Folder className="h-3 w-3" />{scope === "folder" && scopeLabel ? scopeLabel : "指定文件夹"}<ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            {foldersList.length === 0 ? (
              <DropdownMenuItem disabled>暂无文件夹</DropdownMenuItem>
            ) : foldersList.map((f: any) => (
              <DropdownMenuItem key={f.id} onClick={() => { setScope("folder"); setScopeId(f.id); setScopeLabel(f.name) }}>
                <Folder className="h-3 w-3 mr-2" />{f.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={scope === "file" ? "secondary" : "ghost"} size="sm" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />{scope === "file" && scopeLabel ? scopeLabel : "指定文件"}<ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            {indexedFiles.length === 0 ? (
              <DropdownMenuItem disabled>暂无已索引文件</DropdownMenuItem>
            ) : indexedFiles.map((f: any) => (
              <DropdownMenuItem key={f.id} onClick={() => { setScope("file"); setScopeId(f.id); setScopeLabel(f.name) }}>
                <FileText className="h-3 w-3 mr-2" />{f.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-b border-border">
          {error}
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <MessageSquare className="h-12 w-12" />
          {indexedCount > 0 ? (
            <>
              <p className="text-lg font-medium text-foreground">AI 已记住 {indexedCount} 个文件</p>
              <p className="text-sm">问任何关于你文件的问题</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-foreground">开始和 AI 对话</p>
              <p className="text-sm">先上传文件让 AI 记住，然后提问</p>
            </>
          )}
        </div>
      )}
      {messages.length > 0 && <MessageList messages={messages} streaming={streaming} />}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
