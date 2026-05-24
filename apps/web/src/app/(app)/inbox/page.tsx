"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { relativeTime } from "@/lib/relative-time"
import { cn } from "@/lib/utils"
import { HandoffCard } from "@/components/handoff/handoff-card"

interface HandoffRaw {
  id: string
  from_user_name?: string
  from_user_avatar?: string
  to_user_name?: string
  to_user_avatar?: string
  context_pack?: {
    task?: string
    key_facts?: string[]
    next_steps?: string[]
  }
  status: string
  created_at: string
}

interface Handoff {
  id: string
  sender_name?: string
  sender_avatar?: string
  recipient_name?: string
  recipient_avatar?: string
  context_pack?: {
    task?: string
    key_facts?: string[]
    next_steps?: string[]
  }
  status: string
  created_at: string
}

function mapHandoff(raw: HandoffRaw): Handoff {
  return {
    ...raw,
    sender_name: raw.from_user_name,
    sender_avatar: raw.from_user_avatar,
    recipient_name: raw.to_user_name,
    recipient_avatar: raw.to_user_avatar,
  }
}

type Tab = "received" | "sent"

const statusBadge: Record<string, { label: string; className: string }> = {
  sent: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  received: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Declined", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "Expired", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
}

export default function InboxPage() {
  const [tab, setTab] = useState<Tab>("received")
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setSelectedId(null)
    const role = tab === "received" ? "to" : "from"
    apiFetch(`/handoffs?role=${role}`)
      .then((res) => res.json())
      .then((data) => {
        const items: HandoffRaw[] = Array.isArray(data) ? data : data?.items ?? []
        setHandoffs(items.map(mapHandoff))
      })
      .catch(() => setHandoffs([]))
      .finally(() => setLoading(false))
  }, [tab])

  const selected = handoffs.find((h) => h.id === selectedId)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-200 dark:border-zinc-800">
        {(["received", "sent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            {t === "received" ? "Received" : "Sent"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : handoffs.length === 0 ? (
        <p className="text-zinc-500 text-center py-12">No handoffs yet</p>
      ) : (
        <div className="space-y-2">
          {handoffs.map((h) => {
            const badge = statusBadge[h.status] ?? statusBadge.sent
            const name = tab === "received" ? h.sender_name : h.recipient_name
            const avatar = tab === "received" ? h.sender_avatar : h.recipient_avatar
            const summary = (h.context_pack?.task ?? "").slice(0, 60)

            return (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id === selectedId ? null : h.id)}
                className={cn(
                  "w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  selectedId === h.id
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0 overflow-hidden">
                  {avatar && <img src={avatar} alt="" className="h-full w-full object-cover" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{name ?? "Unknown"}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{summary || "No summary"}</p>
                </div>

                {/* Timestamp */}
                <span className="text-[11px] text-zinc-400 flex-shrink-0">{relativeTime(h.created_at)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Expanded card */}
      {selected && (
        <div className="mt-4">
          <HandoffCard handoff={selected} onStatusChange={() => {
            // Refresh list
            const role = tab === "received" ? "to" : "from"
            apiFetch(`/handoffs?role=${role}`)
              .then((res) => res.json())
              .then((data) => {
                const items: HandoffRaw[] = Array.isArray(data) ? data : data?.items ?? []
                setHandoffs(items.map(mapHandoff))
              })
          }} />
        </div>
      )}
    </div>
  )
}
