"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Upload, Plus, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SlashCommand {
  name: string
  description: string
  icon: React.ReactNode
  action: string
}

const COMMANDS: SlashCommand[] = [
  { name: "/search", description: "Search your knowledge base", icon: <Search className="h-4 w-4" />, action: "search" },
  { name: "/upload", description: "Upload a file", icon: <Upload className="h-4 w-4" />, action: "upload" },
  { name: "/new", description: "Start a new conversation", icon: <Plus className="h-4 w-4" />, action: "new" },
  { name: "/help", description: "Show available commands", icon: <HelpCircle className="h-4 w-4" />, action: "help" },
]

interface SlashCommandsProps {
  query: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  visible: boolean
}

export function SlashCommands({ query, onSelect, onClose, visible }: SlashCommandsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = COMMANDS.filter(cmd =>
    cmd.name.slice(1).toLowerCase().startsWith(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => (i + 1) % filtered.length) }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => (i - 1 + filtered.length) % filtered.length) }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (filtered[activeIndex]) onSelect(filtered[activeIndex]) }
      else if (e.key === "Escape") { onClose() }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [visible, activeIndex, filtered, onSelect, onClose])

  if (!visible || filtered.length === 0) return null

  return (
    <div ref={ref} className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border bg-background shadow-lg overflow-hidden z-50">
      {filtered.map((cmd, i) => (
        <button
          key={cmd.action}
          onClick={() => onSelect(cmd)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
            i === activeIndex ? "bg-accent" : "hover:bg-accent/50"
          )}
        >
          <span className="text-muted-foreground">{cmd.icon}</span>
          <div>
            <span className="text-sm font-medium">{cmd.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{cmd.description}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
