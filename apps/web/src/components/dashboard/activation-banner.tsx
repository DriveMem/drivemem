"use client"

import { useState, useEffect } from "react"
import { Upload, MessageCircle, Terminal, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

interface ActivationStatus {
  activated: boolean
  completedActions: string[]
  nextAction: string | null
  completedCount: number
  totalRequired: number
}

const ACTION_CONFIG: Record<string, {
  icon: typeof Upload
  title: string
  description: string
  cta: string
  href: string
}> = {
  file_upload: {
    icon: Upload,
    title: "Upload your first file",
    description: "Drop a file to start building your AI knowledge base",
    cta: "Upload a file",
    href: "/dashboard?upload=1",
  },
  chat_first: {
    icon: MessageCircle,
    title: "Ask your knowledge base anything",
    description: "Try asking a question — DriveMem searches your files and gives AI-powered answers",
    cta: "Try asking",
    href: "/chat?new=1",
  },
  mcp_connect: {
    icon: Terminal,
    title: "Connect your AI tools",
    description: "Connect Cursor, Claude, or any MCP tool in 30 seconds",
    cta: "Connect now",
    href: "/developers",
  },
}

export function ActivationBanner() {
  const [status, setStatus] = useState<ActivationStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check localStorage for today's dismiss
    const dismissedDate = localStorage.getItem("activation_banner_dismissed_date")
    const today = new Date().toISOString().slice(0, 10)
    if (dismissedDate === today) {
      setDismissed(true)
      return
    }

    apiFetch("/api/v1/activation-status", { silent: true })
      .then((data: any) => {
        if (data && !data.activated) {
          setStatus(data)
        }
      })
      .catch(() => {})
  }, [])

  if (dismissed || !status || status.activated || !status.nextAction) return null

  const config = ACTION_CONFIG[status.nextAction]
  if (!config) return null

  const Icon = config.icon

  const handleDismiss = () => {
    setDismissed(true)
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem("activation_banner_dismissed_date", today)
    trackEvent("nudge_dismissed", { step: status.nextAction || "" })
  }

  return (
    <div className="mx-4 md:mx-6 mb-6 flex items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{config.title}</p>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{config.description}</p>
        <div className="flex items-center gap-2 mt-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 w-8 rounded-full ${i < status.completedCount ? 'bg-blue-600 dark:bg-blue-400' : 'bg-blue-200 dark:bg-blue-700'}`} />
          ))}
          <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">{status.completedCount}/3 done</span>
        </div>
      </div>
      <Button
        variant="default"
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        asChild
        onClick={() => trackEvent("nudge_clicked", { step: status.nextAction || "" })}
      >
        <Link href={config.href}>{config.cta}</Link>
      </Button>
      <button
        onClick={handleDismiss}
        className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
