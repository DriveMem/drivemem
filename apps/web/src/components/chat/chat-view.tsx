"use client"
import { useState, useCallback, useEffect, useRef } from "react"
import { MessageSquare, FileText, Folder, Files, ChevronDown, Link2, Download, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageList } from "@/components/chat/message-list"
import { trackEvent } from "@/lib/analytics"
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
import { toast } from "sonner"
import { NetworkError, classifyError } from "@/components/ui/network-error"

type ScopeType = "all" | "folder" | "file"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  citations?: Array<{ fileId: string; fileName: string; chunkIndex: number; text: string }>
}

const PRODUCTION_API = "https://api.drivemem.cloud"
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
const API_BASE = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

const DEFAULT_SUGGESTIONS = [
  "🔍 What are the connections between my files?",
  "💡 What key information is in my files?",
  "📊 Help me analyze my recent uploads",
  "🧠 What decisions have I made recently?",
]

const FEATURE_CARDS = [
  { icon: "📄", title: "Files Q&A", desc: "Answer questions based on your file content" },
  { icon: "🔗", title: "Connections", desc: "Automatically discover connections between files" },
  { icon: "📝", title: "Content Summary", desc: "Quickly extract key information from files" },
]

function EmptyState({ indexedCount, onSend }: { indexedCount: number; onSend: (msg: string) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    apiFetch("/api/conversations/suggestions", { silent: true })
      .then((data: any) => {
        if (data?.suggestions?.length) setSuggestions(data.suggestions.slice(0, 4))
      })
      .catch(() => {/* fallback to defaults */})
  }, [])

  const chips = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-8 pb-4 overflow-y-auto">
      {/* Hero section */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-brand-500/5">
          <MessageSquare className="h-8 w-8 text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Your DriveMem assistant</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
          {indexedCount > 0
            ? `Remembered ${indexedCount} files. Ready to answer questions and discover connections`
            : "Upload files to your knowledge library. I'll help you memorize, analyze, and connect"}
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="w-full max-w-lg mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Try asking: </p>
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((q, i) => (
            <button key={i} onClick={() => onSend(q)}
              className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground/80 hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02] transition-all duration-200 cursor-pointer">
              {suggestions.length > 0 ? `✨ ${q}` : q}
            </button>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {FEATURE_CARDS.map((card, i) => (
          <div key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-4 text-center shadow-soft hover:shadow-soft-md transition-all duration-200">
            <span className="text-xl">{card.icon}</span>
            <span className="text-xs font-medium text-foreground">{card.title}</span>
            <span className="text-[11px] text-muted-foreground leading-tight">{card.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatView({ conversationId: initialConversationId, fileScope, presetQuestion, compareMode, fileA, fileB }: { conversationId?: string; fileScope?: string; presetQuestion?: string; compareMode?: boolean; fileA?: string; fileB?: string }) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState<string | undefined>(undefined)
  const [scope, setScope] = useState<ScopeType>(fileScope ? "file" : "all")
  const [scopeId, setScopeId] = useState<string | undefined>(fileScope || undefined)

  // Compare mode: force scope to "all" and extract file names from query
  const compareFileNames = compareMode && presetQuestion
    ? (() => {
        const match = presetQuestion.match(/Compare "(.+?)" and "(.+?)"/)
        return match ? { a: match[1], b: match[2] } : null
      })()
    : null

  useEffect(() => {
    if (compareMode) {
      setScope("all")
      setScopeId(undefined)
    }
  }, [compareMode])
  const [scopeLabel, setScopeLabel] = useState<string | undefined>(undefined)
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastUserMessageRef = useRef<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

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
    lastUserMessageRef.current = content
    setError(null)
    setFollowUpSuggestions([])
    const isFirstMessage = messages.length === 0
    const userMsg: ChatMessage = { id: "u-" + Date.now(), role: "user", content, createdAt: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    if (isFirstMessage) trackEvent("chat_first_message")
    setSending(true)
    setStreaming("")
    setFollowUpSuggestions([])

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
        setError("Today's chat quota used up. Come back tomorrow")
        setStreaming(undefined)
        setSending(false)
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || "SendFailed")
      }

      // Parse SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""
      let assistantCitations: any[] = []
      if (!reader) throw new Error("No reader")

      setFollowUpSuggestions([])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let currentEvent = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (currentEvent === "thinking") {
                // Backend is searching knowledge base — keep thinking animation
              } else if (currentEvent === "suggestions") {
                if (data.suggestions?.length) {
                  setFollowUpSuggestions(data.suggestions.slice(0, 3))
                }
              } else if (data.content !== undefined) {
                fullContent += data.content
                setStreaming(fullContent)
              } else if (data.messageId) {
                assistantCitations = data.citations || []
              } else if (data.code) {
                setError(data.message || "Generation failed")
              }
            } catch {}
            currentEvent = ""
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
      setMessages((prev) => {
        const updated = [...prev, assistantMsg]
        // Show toast when auto-capture likely triggered
        if (updated.length > 0 && updated.length % 10 === 0 && updated.length >= 10) {
          toast.success('✨ DriveMem is learning from this conversation', { duration: 3000 })
        }
        return updated
      })
      // Refresh conversation list (title may have been auto-generated)
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    } catch (err: any) {
      setError(err.message || "Network error")
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
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-brand-500/5">
          <MessageSquare className="h-8 w-8 text-brand-500" />
        </div>
        <p className="text-lg font-medium text-foreground">You haven't let AI remember any files yet</p>
        <Button asChild className="bg-brand-500 hover:bg-brand-500/90 text-white rounded-xl px-6 shadow-soft active:scale-[0.98] transition-all duration-200"><Link href="/dashboard">Upload files</Link></Button>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col page-enter"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setIsDragging(false) }}
      onDrop={async (e) => {
        e.preventDefault()
        setIsDragging(false)
        const files = e.dataTransfer.files
        if (files.length === 0) return
        setUploading(true)
        try {
          const session = await getSession()
          const token = (session as any)?.accessToken
          for (const file of Array.from(files)) {
            const formData = new FormData()
            formData.append("file", file)
            await fetch(`${API_BASE}/api/files/upload`, {
              method: "POST",
              headers: token ? { "Authorization": `Bearer ${token}` } : {},
              credentials: "include",
              body: formData,
            })
          }
          toast.success(`${files.length} files uploaded successfully. AI is processing...`)
          queryClient.invalidateQueries({ queryKey: ["files"] })
        } catch {
          toast.error("Upload failed")
        } finally {
          setUploading(false)
        }
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl">
          <div className="text-center">
            <Upload className="h-10 w-10 text-brand-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-brand-500">Drag files here to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Upload and AI will automatically understand the file content</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 border-b border-border px-3 md:px-4 py-2 overflow-x-auto scrollbar-none">
        <span className="text-xs text-muted-foreground">AI Memory scope: </span>
        <Button variant={scope === "all" ? "secondary" : "ghost"} size="sm" onClick={() => { setScope("all"); setScopeId(undefined); setScopeLabel(undefined); toast("Memory scope: All files", { duration: 1500 }) }} className="gap-1 text-xs rounded-full">
          <Files className="h-3 w-3" />All Files{scope === "all" && indexedCount > 0 && <span className="ml-1 rounded-full bg-brand-500 text-white text-[10px] px-1.5 py-0 leading-4 font-medium">{indexedCount}</span>}
        </Button>
        {scope !== "all" && scopeLabel && (
          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-500 font-medium">
            Current: {scopeLabel}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={scope === "folder" ? "secondary" : "ghost"} size="sm" className="gap-1 text-xs rounded-full">
              <Folder className="h-3 w-3" />{scope === "folder" && scopeLabel ? scopeLabel : "Specified folder"}{scope === "folder" && scopeId && <span className="ml-1 rounded-full bg-brand-500 text-white text-[10px] px-1.5 py-0 leading-4 font-medium">1</span>}<ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            {foldersList.length === 0 ? (
              <DropdownMenuItem disabled>No files</DropdownMenuItem>
            ) : foldersList.map((f: any) => (
              <DropdownMenuItem key={f.id} onClick={() => { setScope("folder"); setScopeId(f.id); setScopeLabel(f.name); toast(`Memory scope: ${f.name}`, { duration: 1500 }) }}>
                <Folder className="h-3 w-3 mr-2" />{f.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={scope === "file" ? "secondary" : "ghost"} size="sm" className="gap-1 text-xs rounded-full">
              <FileText className="h-3 w-3" />{scope === "file" && scopeLabel ? scopeLabel : "Specified files"}{scope === "file" && scopeId && <span className="ml-1 rounded-full bg-brand-500 text-white text-[10px] px-1.5 py-0 leading-4 font-medium">1</span>}<ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            {indexedFiles.length === 0 ? (
              <DropdownMenuItem disabled>No indexed files</DropdownMenuItem>
            ) : indexedFiles.map((f: any) => (
              <DropdownMenuItem key={f.id} onClick={() => { setScope("file"); setScopeId(f.id); setScopeLabel(f.name); toast(`Memory scope: ${f.name}`, { duration: 1500 }) }}>
                <FileText className="h-3 w-3 mr-2" />{f.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1 text-xs"
            onClick={() => {
              const md = messages.map(m => {
                const role = m.role === "user" ? "## 👤 User" : "## 🤖 AI"
                let text = `${role}\n\n${m.content}\n`
                if (m.citations && m.citations.length > 0) {
                  text += "\n**Sources:**\n" + m.citations.map((c: any, i: number) => `${i+1}. ${c.fileName}${c.text ? ' — "' + c.text.slice(0,100) + '..."' : ''}`).join("\n") + "\n"
                }
                return text
              }).join("\n---\n\n")
              const blob = new Blob([md], { type: "text/markdown" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `Conversation-${new Date().toISOString().slice(0, 10)}.md`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-3 w-3" />Export
          </Button>
        )}
      </div>

      {compareMode && compareFileNames && (
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 text-sm">
          <Link2 className="h-4 w-4 text-purple-400" />
          <span className="font-medium">Compare analysis</span>
          <span className="text-muted-foreground">· {compareFileNames.a} vs {compareFileNames.b}</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 border-b border-border">
          <NetworkError
            mode="inline"
            type={classifyError(error)}
            message={error}
            onRetry={lastUserMessageRef.current ? () => { const msg = lastUserMessageRef.current; if (msg) handleSend(msg) } : undefined}
          />
        </div>
      )}

      {messages.length === 0 && (
        <EmptyState indexedCount={indexedCount} onSend={handleSend} />
      )}
      {messages.length > 0 && <MessageList messages={messages} streaming={streaming} conversationId={conversationId} />}
      {followUpSuggestions.length > 0 && !sending && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-border">
          {followUpSuggestions.map((q, i) => (
            <button key={i} onClick={() => { handleSend(q); setFollowUpSuggestions([]) }}
              className="rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 shadow-sm">
              {q}
            </button>
          ))}
        </div>
      )}
      {uploading && (
        <div className="text-center text-xs text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Uploading...
        </div>
      )}
      <ChatInput onSend={handleSend} disabled={sending} fileCount={filesList.length} hasConversations={messages.length > 0} />
    </div>
  )
}
