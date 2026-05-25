"use client"
import { useState, useMemo } from "react"
import { ChevronDown, ChevronRight, List } from "lucide-react"
import { cn } from "@/lib/utils"

interface Heading {
  level: number
  text: string
  id: string
}

function extractHeadings(content: string): Heading[] {
  const lines = content.split("\n")
  const headings: Heading[] = []
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (match) {
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      headings.push({ level: match[1].length, text, id })
    }
  }
  return headings
}

export function shouldShowTOC(content: string): boolean {
  const headings = extractHeadings(content)
  return headings.length >= 3 && content.length >= 300
}

export function MessageTOC({ content }: { content: string }) {
  const headings = useMemo(() => extractHeadings(content), [content])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [allCollapsed, setAllCollapsed] = useState(false)

  if (headings.length < 3) return null

  const tocItems = (
    <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
      {headings.map((h, i) => (
        <span key={h.id} className="inline-flex items-center">
          {i > 0 && <span className="mx-1 text-muted-foreground/50">·</span>}
          <a
            href={`#${h.id}`}
            onClick={e => {
              e.preventDefault()
              document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" })
            }}
            className={cn("hover:text-foreground transition-colors", h.level === 3 && "ml-1")}
          >
            {h.text}
          </a>
        </span>
      ))}
    </span>
  )

  return (
    <div className="text-xs text-muted-foreground mb-3 pb-2 border-b border-border/50">
      {/* Desktop */}
      <div className="hidden md:flex items-start gap-2">
        <List className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div className="flex-1">{tocItems}</div>
      </div>
      {/* Mobile */}
      <div className="md:hidden">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="flex items-center gap-1 hover:text-foreground">
          📑 Contents {mobileOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {mobileOpen && <div className="mt-1 pl-4">{tocItems}</div>}
      </div>
    </div>
  )
}

export function CollapsibleSection({ heading, children }: { heading: Heading; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setOpen(!open)}>
        <button className="p-0.5 rounded hover:bg-muted/50 transition-colors">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
      <div
        className={cn("overflow-hidden transition-all duration-200", open ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0")}
      >
        {children}
      </div>
    </div>
  )
}
