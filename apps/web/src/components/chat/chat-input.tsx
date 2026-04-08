"use client"
import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ChatInput({ onSend, disabled, dailyLimitReached, scopeHint, fileCount = 0, hasConversations = false }: { onSend: (message: string) => void; disabled?: boolean; dailyLimitReached?: boolean; scopeHint?: string; fileCount?: number; hasConversations?: boolean }) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [placeholder] = useState(() => {
    if (fileCount === 0) {
      const p = ["上传文件后，试试问 AI 任何问题...", "拖拽文件到这里开始，或直接输入问题..."]
      return p[Math.floor(Math.random() * p.length)]
    }
    if (!hasConversations) {
      const p = ["总结我最近上传的文件", "我的文件里有哪些关键信息？", "帮我分析这些文件的共同点"]
      return p[Math.floor(Math.random() * p.length)]
    }
    const p = ["对比我最近上传的两个文件", "基于我的知识库，帮我写一份总结", "我的文件里有没有矛盾的信息？"]
    return p[Math.floor(Math.random() * p.length)]
  })

  useEffect(() => {
    const el = textareaRef.current
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px" }
  }, [value])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled || dailyLimitReached) return
    onSend(trimmed)
    setValue("")
  }

  if (dailyLimitReached) {
    return (
      <div className="border-t border-border px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">今天的对话次数已用完，明天再来 💤</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 pb-4">
      {scopeHint && (
        <p className="text-xs text-muted-foreground/70 text-center mb-2">🔍 {scopeHint}</p>
      )}
      <div className="flex items-center gap-2 rounded-2xl shadow-lg bg-muted/30 border border-border/50 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-sm placeholder-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button onClick={handleSend} disabled={disabled || !value.trim()} className="rounded-full bg-[#4F5BD5] hover:bg-[#3D49C4] p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
