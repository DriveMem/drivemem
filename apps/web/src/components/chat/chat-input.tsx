"use client"
import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ChatInput({ onSend, disabled, dailyLimitReached, scopeHint, fileCount = 0, hasConversations = false }: { onSend: (message: string) => void; disabled?: boolean; dailyLimitReached?: boolean; scopeHint?: string; fileCount?: number; hasConversations?: boolean }) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getPlaceholders = () => {
    if (fileCount === 0 && !hasConversations) {
      return [
        "Upload a file first, and AI can help you analyze and answer questions",
      ]
    }
    if (hasConversations) {
      return [
        "ContinueAsk a question...",
        "Ask more...",
      ]
    }
    return [
      "Summarize my recently uploaded files",
      "Organize the key points of this paper",
      "Compare the viewpoints of these two files",
      "What key information is in my files?",
      "Help me map out connections between files",
      "Summarize my knowledge library in one paragraph",
    ]
  }

  const [placeholder, setPlaceholder] = useState(() => {
    const p = getPlaceholders()
    return p[Math.floor(Math.random() * p.length)]
  })

  useEffect(() => {
    const interval = setInterval(() => {
      if (value) return // don't rotate while user is typing
      const p = getPlaceholders()
      setPlaceholder(p[Math.floor(Math.random() * p.length)])
    }, 12000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, fileCount, hasConversations])

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
        <p className="text-sm text-muted-foreground">Today's chat quota used up. Come back tomorrow 💤</p>
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
        <button onClick={handleSend} disabled={disabled || !value.trim()} className="rounded-full bg-brand-500 hover:bg-brand-600 p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
