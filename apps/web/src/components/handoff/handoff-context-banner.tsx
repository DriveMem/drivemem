"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeftRight } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface HandoffContext {
  sender_name?: string
  context_pack?: {
    task?: string
    key_facts?: string[]
  }
}

export function HandoffContextBanner() {
  const searchParams = useSearchParams()
  const handoffId = searchParams.get("handoff_id")
  const [context, setContext] = useState<HandoffContext | null>(null)

  useEffect(() => {
    if (!handoffId) return
    apiFetch(`/handoffs/${handoffId}`, { silent: true })
      .then((res) => res.json())
      .then(setContext)
      .catch(() => {})
  }, [handoffId])

  if (!handoffId || !context) return null

  return (
    <div className="mx-auto max-w-[640px] w-full mb-4 px-4">
      <div className="flex items-start gap-3 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-500/10 p-3">
        <ArrowLeftRight className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Continued from {context.sender_name ?? "someone"}&apos;s handoff
          </p>
          {context.context_pack?.task && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{context.context_pack.task}</p>
          )}
        </div>
      </div>
    </div>
  )
}
