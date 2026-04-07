"use client"
import { useRef, useEffect, useState, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Loader2, Bot, User, Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/mock-chat"
import { Citation } from "./citation"
import { apiFetch } from "@/lib/api"

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
    <div className="group/code relative">
      <pre ref={ref} {...props}>{children}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 rounded-md bg-muted/80 p-1.5 opacity-0 group-hover/code:opacity-100 transition"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

const markdownComponents = {
  pre: CodeBlock,
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full border-collapse border border-border text-sm" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-muted/50" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }: any) => (
    <th className="border border-border px-3 py-2 text-left font-medium text-sm" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="border border-border px-3 py-2 text-sm" {...props}>{children}</td>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 my-3 text-muted-foreground italic" {...props}>{children}</blockquote>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc pl-6 my-2 space-y-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal pl-6 my-2 space-y-1" {...props}>{children}</ol>
  ),
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function formatFullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN")
}

function MessageActionBar({
  conversationId,
  messageId,
  content,
  onRegenerate,
}: {
  conversationId?: string
  messageId: string
  content: string
  onRegenerate?: () => void
}) {
  const [rating, setRating] = useState<"thumbs_up" | "thumbs_down" | null>(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success("已复制")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRate = async (value: "thumbs_up" | "thumbs_down") => {
    if (!conversationId || ratingLoading) return
    setRatingLoading(true)
    try {
      await apiFetch(`/api/conversations/${conversationId}/messages/${messageId}/rating`, {
        method: "POST",
        body: JSON.stringify({ rating: value }),
      })
      setRating(value)
    } catch {
      toast.error("评分失败")
    } finally {
      setRatingLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 rounded-lg px-1 py-0.5 w-fit">
      <button onClick={handleCopy} className="p-1.5 rounded hover:bg-accent transition" title="复制">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <button
        onClick={() => handleRate("thumbs_up")}
        className={cn("p-1.5 rounded hover:bg-accent transition", rating === "thumbs_up" && "text-green-500")}
        title="有帮助"
      >
        <ThumbsUp className={cn("h-3.5 w-3.5", rating === "thumbs_up" ? "fill-current" : "text-muted-foreground")} />
      </button>
      <button
        onClick={() => handleRate("thumbs_down")}
        className={cn("p-1.5 rounded hover:bg-accent transition", rating === "thumbs_down" && "text-red-500")}
        title="没帮助"
      >
        <ThumbsDown className={cn("h-3.5 w-3.5", rating === "thumbs_down" ? "fill-current" : "text-muted-foreground")} />
      </button>
      {onRegenerate && (
        <button onClick={onRegenerate} className="p-1.5 rounded hover:bg-accent transition" title="重新生成">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

export function MessageList({
  messages,
  streaming,
  conversationId,
  onRegenerate,
}: {
  messages: ChatMessage[]
  streaming?: string
  conversationId?: string
  onRegenerate?: () => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, streaming])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollToBottom(distanceFromBottom > 150)
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Find last user message index for regenerate button placement
  const lastAssistantIdx = messages.length > 0 && messages[messages.length - 1].role === "assistant"
    ? messages.length - 1
    : -1

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-auto px-4 py-6 space-y-4 relative">
      {messages.map((msg, idx) => (
        <div key={msg.id} className={cn(
          "flex gap-3 group",
          msg.role === "user" ? "justify-end" : "",
          // Different role → gap-6, same role → gap-3
          idx > 0 && messages[idx - 1].role !== msg.role ? "mt-6" : idx > 0 ? "mt-3" : "",
          // Timeline vertical line for assistant messages
          msg.role === "assistant" && "border-l-2 border-border/30 pl-3"
        )}>
          {msg.role === "assistant" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
          <div className={cn("text-sm", msg.role === "user" ? "ml-auto max-w-[70%] bg-[#4F5BD5] text-white rounded-2xl rounded-br-sm px-4 py-3" : "mr-auto w-full bg-muted/50 rounded-2xl rounded-bl-sm px-4 py-4 border border-border/50")}>
            {msg.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>{msg.content}</ReactMarkdown>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-2">📎 引用文件</div>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((c, i) => <Citation key={i} citation={c} idx={i} />)}
                    </div>
                  </div>
                )}
<<<<<<< HEAD
                <MessageActionBar
                  conversationId={conversationId}
                  messageId={msg.id}
                  content={msg.content}
                  onRegenerate={idx === lastAssistantIdx ? onRegenerate : undefined}
                />
=======
                {!msg.id.startsWith("a-") && <MessageRating conversationId={conversationId} messageId={msg.id} />}
                {msg.createdAt && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1 text-right" title={formatFullTime(msg.createdAt)}>
                    {formatTime(msg.createdAt)}
                  </p>
                )}
>>>>>>> origin/feat/ai-drive-web
              </div>
            ) : (<><p>{msg.content}</p>{msg.createdAt && (
                  <p className="text-[10px] text-white/50 mt-1 text-right" title={formatFullTime(msg.createdAt)}>
                    {formatTime(msg.createdAt)}
                  </p>
                )}</>)}
          </div>
          {msg.role === "user" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4F5BD5] flex items-center justify-center text-white text-xs font-bold">U</div>}
        </div>
      ))}
      {streaming !== undefined && (
        <div className="flex gap-3 mt-6">
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

      {/* Jump to latest floating button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-background/90 border border-border shadow-lg px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-all backdrop-blur-sm"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          跳到最新
        </button>
      )}
    </div>
  )
}
