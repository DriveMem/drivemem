"use client"
import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { Send, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { SlashCommands } from "./slash-commands"
import { FileMention } from "./file-mention"

export function ChatInput({ onSend, disabled, dailyLimitReached, scopeHint, fileCount = 0, hasConversations = false }: { onSend: (message: string, contextFileIds?: string[]) => void; disabled?: boolean; dailyLimitReached?: boolean; scopeHint?: string; fileCount?: number; hasConversations?: boolean }) {
  const [value, setValue] = useState("")
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState("")
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<{id: string, name: string}[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // S4: Mobile keyboard adaptation — shift input above virtual keyboard
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return
    const vv = window.visualViewport
    const onResize = () => {
      const el = containerRef.current
      if (!el) return
      const offset = window.innerHeight - vv.height
      el.style.transform = offset > 50 ? `translateY(-${offset}px)` : ""
    }
    vv.addEventListener("resize", onResize)
    vv.addEventListener("scroll", onResize)
    return () => {
      vv.removeEventListener("resize", onResize)
      vv.removeEventListener("scroll", onResize)
    }
  }, [])

  const getPlaceholders = () => {
    if (fileCount === 0 && !hasConversations) {
      return [
        "Upload a file first, and AI can help you analyze and answer questions",
      ]
    }
    if (hasConversations) {
      return [
        "Ask a follow-up question...",
        "Ask more...",
      ]
    }
    return [
      "Ask anything about your knowledge...",
      "What key information is in my files?",
      "Compare the viewpoints of these two files",
      "Help me find connections between files",
      "What decisions have I made recently?",
    ]
  }

  const [placeholder] = useState("Ask anything about your knowledge...")

  useEffect(() => {
    const interval = setInterval(() => {
      // placeholder is now fixed — no rotation
      void 0
    }, 12000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, fileCount, hasConversations])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const maxH = window.innerHeight * 0.5
    const next = Math.min(el.scrollHeight, maxH)
    el.style.height = next + "px"
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden"
  }, [value])

  const handleFileSelect = (file: {id: string, name: string}) => {
    setMentionOpen(false)
    setValue(prev => prev.replace(/@\S*$/, ''))
    if (selectedFiles.length < 5 && !selectedFiles.find(f => f.id === file.id)) {
      setSelectedFiles(prev => [...prev, file])
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (slashOpen || mentionOpen) return // let popover handle keys
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSlashSelect = (cmd: { action: string }) => {
    setSlashOpen(false)
    setValue("")
    trackEvent("slash_command.select", { command: cmd.action })
    switch (cmd.action) {
      case "search": {
        const searchQuery = slashQuery.replace(/^search\s*/i, "").trim()
        router.push(searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search")
        break
      }
      case "upload":
        router.push("/files")
        break
      case "new":
        router.push("/chat?new=" + Date.now())
        break
      case "help":
        break
    }
  }

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled || dailyLimitReached) return
    if (trimmed.startsWith("/")) {
      const parts = trimmed.split(/\s+/)
      const cmdName = parts[0].toLowerCase()
      if (cmdName === "/search") { router.push(`/search?q=${encodeURIComponent(parts.slice(1).join(" "))}`); setValue(""); return }
      if (cmdName === "/upload") { router.push("/files"); setValue(""); return }
      if (cmdName === "/new") { router.push("/chat?new=" + Date.now()); setValue(""); return }
      if (cmdName === "/help") { setValue(""); return }
    }
    onSend(trimmed, selectedFiles.length > 0 ? selectedFiles.map(f => f.id) : undefined)
    setValue("")
    setSelectedFiles([])
    // Reset textarea height on send
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.overflowY = "hidden"
    }
  }

  if (dailyLimitReached) {
    return (
      <div className="border-t border-border px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">Today's chat quota used up. Come back tomorrow 💤</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto w-full px-4 pb-4 transition-transform duration-150" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      {scopeHint && (
        <p className="text-xs text-muted-foreground/70 text-center mb-2">🔍 {scopeHint}</p>
      )}
      {value.length > 3000 && (
        <p className={cn("text-xs text-right mb-1 transition-colors", value.length > 4000 ? "text-red-500" : "text-muted-foreground/70")}>{value.length.toLocaleString()} / 4,000</p>
      )}
      <div className="relative">
        <SlashCommands
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => setSlashOpen(false)}
          visible={slashOpen}
        />
        <FileMention
          query={mentionQuery}
          onSelect={handleFileSelect}
          onClose={() => setMentionOpen(false)}
          visible={mentionOpen}
        />
        <div className="flex flex-col rounded-2xl shadow-soft-md bg-background border border-border/50 transition-all duration-300 focus-within:shadow-soft-lg focus-within:border-primary/20">
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1 px-4 pt-3">
              {selectedFiles.map(f => (
                <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-50 dark:bg-brand-500/10 text-brand-600 border border-brand-200 dark:border-brand-500/30">
                  <FileText className="h-3 w-3" />
                  {f.name}
                  <button onClick={() => setSelectedFiles(prev => prev.filter(x => x.id !== f.id))} className="ml-0.5 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              const newValue = e.target.value
              setValue(newValue)
              if (newValue.startsWith("/")) {
                setSlashOpen(true)
                setSlashQuery(newValue.slice(1))
                setMentionOpen(false)
              } else {
                setSlashOpen(false)
                setSlashQuery("")
                const atMatch = newValue.match(/@(\S*)$/)
                if (atMatch) {
                  setMentionOpen(true)
                  setMentionQuery(atMatch[1])
                } else {
                  setMentionOpen(false)
                }
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none transition-[height] duration-100 outline-none text-body min-h-[48px] placeholder-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={disabled || !value.trim()} className="rounded-xl w-10 h-10 bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 active:scale-[0.95] transition-all duration-200 shadow-soft flex items-center justify-center">
            <Send className="h-4 w-4" />
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
