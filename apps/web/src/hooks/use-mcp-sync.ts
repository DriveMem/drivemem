"use client"

import { useEffect, useRef, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

interface AgentActivity {
  id: string
  agentName: string
  action: string
  summary: string
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  store: "saved knowledge",
  auto_capture: "auto-captured insights",
  capture: "captured a conversation",
  search: "searched your knowledge",
  ask: "asked your knowledge base",
  compile: "compiled context",
}

const POLL_INTERVAL = 30_000 // 30s
const RECENCY_WINDOW = 120_000 // only toast for activities within 2min

/**
 * Polls for new MCP agent activity and shows toast notifications.
 * Place in Dashboard layout so it runs while user is viewing dashboard.
 */
export function useMcpSync(enabled = true) {
  const seenIds = useRef(new Set<string>())
  const initialized = useRef(false)

  const poll = useCallback(async () => {
    try {
      const data = (await apiFetch("/api/agent-activity?limit=5", {
        silent: true,
      })) as { activities?: AgentActivity[] } | null
      const activities = data?.activities || []

      if (!initialized.current) {
        // First poll: seed seen IDs without toasting
        for (const a of activities) seenIds.current.add(a.id)
        initialized.current = true
        return
      }

      for (const a of activities) {
        if (seenIds.current.has(a.id)) continue
        seenIds.current.add(a.id)

        // Only toast for recent activities (within 2min)
        const age = Date.now() - new Date(a.createdAt).getTime()
        if (age > RECENCY_WINDOW) continue

        // Only toast for write actions (store/capture) — skip reads
        if (!["store", "auto_capture", "capture"].includes(a.action)) continue

        const label = ACTION_LABELS[a.action] || a.action
        const agent = a.agentName || "An AI agent"
        toast.info(`🤖 ${agent} ${label}`, {
          description: a.summary || undefined,
          duration: 6000,
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/files"
            },
          },
        })
      }

      // Cap seen set to prevent memory leak
      if (seenIds.current.size > 200) {
        const arr = [...seenIds.current]
        seenIds.current = new Set(arr.slice(-100))
      }
    } catch {
      // silent — non-critical background polling
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Initial poll after short delay (let dashboard load first)
    const initTimer = setTimeout(poll, 2000)

    const interval = setInterval(poll, POLL_INTERVAL)

    return () => {
      clearTimeout(initTimer)
      clearInterval(interval)
    }
  }, [enabled, poll])
}
