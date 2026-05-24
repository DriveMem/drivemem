"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, Check, MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { relativeTime } from "@/lib/relative-time"

interface HandoffData {
  id: string
  sender_name?: string
  sender_avatar?: string
<<<<<<< HEAD
  from_user_name?: string
  from_user_avatar?: string
=======
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
  context_pack?: {
    task?: string
    key_facts?: string[]
    next_steps?: string[]
  }
  status: string
  created_at: string
}

interface HandoffCardProps {
  handoff: HandoffData
  onStatusChange?: () => void
}

export function HandoffCard({ handoff, onStatusChange }: HandoffCardProps) {
  const router = useRouter()
  const [status, setStatus] = useState(handoff.status)
  const [factsExpanded, setFactsExpanded] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [loading, setLoading] = useState(false)

  const keyFacts = handoff.context_pack?.key_facts ?? []
  const nextSteps = handoff.context_pack?.next_steps ?? []
  const visibleFacts = factsExpanded ? keyFacts : keyFacts.slice(0, 3)

  const isActionable = status === "sent" || status === "received"

  async function handleAccept() {
    setLoading(true)
    try {
      await apiFetch(`/handoffs/${handoff.id}/accept`, { method: "POST" })
      setStatus("accepted")
      onStatusChange?.()
      router.push(`/chat?handoff_id=${handoff.id}`)
    } catch {
      // error toast handled by apiFetch
    } finally {
      setLoading(false)
    }
  }

  async function handleReply() {
    if (!replyText.trim()) return
    setLoading(true)
    try {
      await apiFetch(`/handoffs/${handoff.id}/request-more`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: [replyText.trim()] }),
      })
      setStatus("pending_supplement")
      setShowReplyInput(false)
      setReplyText("")
      onStatusChange?.()
    } catch {
      // error toast handled by apiFetch
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await apiFetch(`/handoffs/${handoff.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      })
      setStatus("rejected")
      setShowRejectModal(false)
      setRejectReason("")
      onStatusChange?.()
    } catch {
      // error toast handled by apiFetch
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[640px] mx-auto border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
            {handoff.sender_avatar && <img src={handoff.sender_avatar} alt="" className="h-full w-full object-cover" />}
          </div>
<<<<<<< HEAD
          <span className="text-sm font-medium">Handoff from {handoff.sender_name ?? handoff.from_user_name ?? "Unknown"}</span>
=======
          <span className="text-sm font-medium">Handoff from {handoff.sender_name ?? "Unknown"}</span>
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
        </div>
        <span className="text-xs text-zinc-400">{relativeTime(handoff.created_at)}</span>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{handoff.context_pack?.task ?? "No summary"}</p>
      </div>

      {/* Key Facts */}
      {keyFacts.length > 0 && (
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setFactsExpanded(!factsExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-zinc-500 mb-2"
          >
            Key Facts
            {keyFacts.length > 3 && (factsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
          </button>
          <ul className="space-y-1">
            {visibleFacts.map((fact, i) => (
              <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex gap-2">
                <span className="text-zinc-400">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
          {!factsExpanded && keyFacts.length > 3 && (
            <button onClick={() => setFactsExpanded(true)} className="text-xs text-brand-500 mt-1">
              +{keyFacts.length - 3} more
            </button>
          )}
        </div>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500 mb-2 block">Next Steps</span>
          <ul className="space-y-1">
            {nextSteps.map((step, i) => (
              <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex gap-2">
                <span className="text-zinc-400">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status badges for non-actionable states */}
      {!isActionable && (
        <div className="px-4 py-3">
          {status === "accepted" && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">✅ Accepted</span>
          )}
          {status === "rejected" && (
            <span className="text-sm text-red-500 font-medium">Declined</span>
          )}
          {status === "pending_supplement" && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">⏳ Waiting for supplement</span>
          )}
        </div>
      )}

      {/* Actions */}
      {isActionable && (
        <div className="px-4 py-3 space-y-3">
          {/* Reply inline input */}
          {showReplyInput && (
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
              />
              <Button size="sm" onClick={handleReply} disabled={loading || !replyText.trim()}>
                Send
              </Button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleAccept} disabled={loading} className="flex-1 sm:flex-none">
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReplyInput(!showReplyInput)}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Reply
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(true)}
              disabled={loading}
              className="flex-1 sm:flex-none text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Reject confirmation modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Reject Handoff</h3>
            <p className="text-sm text-zinc-500 mb-4">Are you sure you want to reject this handoff?</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button onClick={handleReject} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white">
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
