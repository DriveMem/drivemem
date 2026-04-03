"use client"
import { useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Loader2, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/mock-chat"
import { Citation } from "./citation"

export function MessageList({ messages, streaming }: { messages: ChatMessage[]; streaming?: string }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, streaming])
  return (
    <div className="flex-1 overflow-auto px-4 py-6 space-y-6">
      {messages.map((msg) => (
        <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
          {msg.role === "assistant" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
          <div className={cn("text-sm", msg.role === "user" ? "ml-auto max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3" : "mr-auto w-full bg-muted/50 rounded-2xl rounded-bl-sm px-4 py-4 border border-border/50")}>
            {msg.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>
                {msg.citations && msg.citations.length > 0 && (
                  <details className="mt-3 pt-3 border-t border-border">
                    <summary className="text-xs text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground">📎 {msg.citations.length} 个来源引用</summary>
                    <div className="mt-2 space-y-1">
                      {msg.citations.map((c, i) => <Citation key={i} citation={c} idx={i} />)}
                    </div>
                  </details>
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
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{streaming + "▊"}</ReactMarkdown></div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex gap-1">
                  <span className="animate-bounce [animation-delay:0ms] h-2 w-2 rounded-full bg-blue-500" />
                  <span className="animate-bounce [animation-delay:150ms] h-2 w-2 rounded-full bg-blue-500" />
                  <span className="animate-bounce [animation-delay:300ms] h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <span>AI 正在思考...</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
