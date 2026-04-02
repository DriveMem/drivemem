"use client"
import { useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import { Loader2, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Citation } from "./citation"

interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; createdAt: string
  citations?: { index: number; filename: string; snippet: string }[]
}

export function MessageList({ messages, streaming }: { messages: ChatMessage[]; streaming?: string }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, streaming])
  return (
    <div className="flex-1 overflow-auto px-4 py-6 space-y-6">
      {messages.map((msg) => (
        <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
          {msg.role === "assistant" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
          <div className={cn("max-w-[80%] rounded-lg px-4 py-3 text-sm", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {msg.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">引用来源</p>
                    {msg.citations.map((c) => <Citation key={c.index} citation={c} />)}
                  </div>
                )}
              </div>
            ) : <p>{msg.content}</p>}
          </div>
          {msg.role === "user" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><User className="h-4 w-4" /></div>}
        </div>
      ))}
      {streaming !== undefined && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
          <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm bg-muted">
            {streaming ? (
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown rehypePlugins={[rehypeHighlight]}>{streaming + "▊"}</ReactMarkdown></div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>思考中...</span></div>
            )}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
