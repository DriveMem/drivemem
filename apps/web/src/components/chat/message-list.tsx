"use client"
import { useRef, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Loader2, Bot, User, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/mock-chat"
import { Citation } from "./citation"

function CodeBlock({ children, ...props }: any) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    const code = ref.current?.textContent || ""
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success("已复制")
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="group relative">
      <pre ref={ref} {...props}>{children}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 rounded-md bg-muted/80 p-1.5 opacity-0 group-hover:opacity-100 transition"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

const markdownComponents = { pre: CodeBlock }

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
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>{msg.content}</ReactMarkdown>
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
          {msg.role === "user" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">U</div>}
        </div>
      ))}
      {streaming !== undefined && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
          <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm bg-muted">
            {streaming ? (
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>{streaming + "▊"}</ReactMarkdown></div>
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
