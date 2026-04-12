"use client"
import { useRef, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import { Loader2, Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Bookmark, Share2 } from "lucide-react"
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

// Transform inline citations to superscript numbers
function transformCitations(content: string): string {
  let counter = 0
  return content.replace(/\[来源[:：]\s*[^\]]+\]/g, () => {
    counter++
    return `<sup class="citation-ref">${counter}</sup>`
  })
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

function MessageRating({ conversationId, messageId }: { conversationId?: string; messageId: string }) {
  const [rating, setRating] = useState<"thumbs_up" | "thumbs_down" | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRate = async (value: "thumbs_up" | "thumbs_down") => {
    if (!conversationId || loading) return
    setLoading(true)
    try {
      await apiFetch(`/api/conversations/${conversationId}/messages/${messageId}/rating`, {
        method: "POST",
        body: JSON.stringify({ rating: value }),
      })
      setRating(value)
    } catch {
      toast.error("评分失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
      <button
        onClick={() => handleRate("thumbs_up")}
        className={cn("p-1 rounded hover:bg-accent", rating === "thumbs_up" && "text-green-500 opacity-100")}
        title="有帮助"
      >
        <ThumbsUp className={cn("h-3.5 w-3.5", rating === "thumbs_up" ? "fill-current" : "")} />
      </button>
      <button
        onClick={() => handleRate("thumbs_down")}
        className={cn("p-1 rounded hover:bg-accent", rating === "thumbs_down" && "text-red-500 opacity-100")}
        title="没帮助"
      >
        <ThumbsDown className={cn("h-3.5 w-3.5", rating === "thumbs_down" ? "fill-current" : "")} />
      </button>
    </div>
  )
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success("已复制")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveAsNote = async () => {
    setSaving(true)
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      await apiFetch("/api/v1/store", {
        method: "POST",
        body: JSON.stringify({
          content,
          title: `AI笔记-${timestamp}`,
        }),
      })
      toast.success("已保存为笔记")
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    const shareData = { title: "AI 回答", text: content }
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData)
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          navigator.clipboard.writeText(content)
          toast.success("已复制到剪贴板")
        }
      }
    } else {
      navigator.clipboard.writeText(content)
      toast.success("已复制到剪贴板")
    }
  }

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
      <button onClick={handleCopy} className="p-1 rounded hover:bg-accent" title="复制回答">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <button onClick={handleSaveAsNote} disabled={saving} className="p-1 rounded hover:bg-accent" title="保存为笔记">
        <Bookmark className={cn("h-3.5 w-3.5", saving ? "animate-pulse text-[#4F5BD5]" : "text-muted-foreground")} />
      </button>
      <button onClick={handleShare} className="p-1 rounded hover:bg-accent" title="分享">
        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  )
}

export function MessageList({ messages, streaming, conversationId }: { messages: ChatMessage[]; streaming?: string; conversationId?: string }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, streaming])
  return (
    <div className="flex-1 overflow-auto px-4 py-6 space-y-6">
      {messages.map((msg) => (
        <div key={msg.id} className={cn("flex gap-3 group", msg.role === "user" ? "justify-end" : "")}>
          {msg.role === "assistant" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
          <div className={cn("text-sm", msg.role === "user" ? "ml-auto max-w-[70%] bg-[#4F5BD5] text-white rounded-2xl rounded-br-sm px-4 py-3" : "mr-auto w-full bg-muted/50 rounded-2xl rounded-bl-sm px-4 py-4 border border-border/50")}>
            {msg.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]} components={markdownComponents}>{transformCitations(msg.content)}</ReactMarkdown>
                {msg.citations && msg.citations.length > 0 && (
                  <details className="mt-3 pt-3 border-t border-border">
                    <summary className="text-xs text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground">📎 {msg.citations.length} 个来源引用</summary>
                    <div className="mt-2 space-y-1">
                      {msg.citations.map((c, i) => <Citation key={i} citation={c} idx={i} />)}
                    </div>
                  </details>
                )}
                {!msg.id.startsWith("a-") && <MessageRating conversationId={conversationId} messageId={msg.id} />}
                {!msg.id.startsWith("a-") && <MessageActions content={msg.content} />}
                {msg.createdAt && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1 text-right" title={formatFullTime(msg.createdAt)}>
                    {formatTime(msg.createdAt)}
                  </p>
                )}
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
