"use client"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { getSession } from "next-auth/react"
import { MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

const TYPES = [
  { value: "bug", label: "🐛 Bug", description: "Something broken" },
  { value: "suggestion", label: "💡 Suggestion", description: "Feature idea" },
  { value: "confused", label: "🤔 Confused", description: "Hard to use" },
] as const

const EXCLUDED_PATHS = ["/", "/login", "/register", "/landing"]

type FeedbackType = typeof TYPES[number]["value"]

export function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("suggestion")
  const [text, setText] = useState("")
  const [email, setEmail] = useState("")
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getSession().then((s: any) => {
      if (s?.user?.email) {
        setSessionEmail(s.user.email)
        setEmail(s.user.email)
      }
    })
  }, [])

  // Don't show on auth/landing pages (exact match for "/")
  if (pathname === "/" || EXCLUDED_PATHS.some((p) => p !== "/" && pathname.startsWith(p))) return null

  const isLoggedIn = !!sessionEmail
  const canSubmit = text.trim() && (isLoggedIn || email.trim())

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSending(true)
    try {
      await apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          type,
          content: text.trim(),
          email: email.trim() || undefined,
          page: window.location.href,
        }),
      })
      toast.success("Thanks for your feedback!")
      setText("")
      setType("suggestion")
      setOpen(false)
    } catch {
      toast.error("Send failed. Please try again later.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 sm:bottom-6 right-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 hover:scale-105 transition-all duration-200"
        aria-label="Send feedback"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>💬 Send feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                    type === t.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Email (prefilled for logged-in, required for anonymous) */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isLoggedIn ? "Email (prefilled)" : "Email (required)"}
              disabled={isLoggedIn}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
            />
            {/* Message */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Tell us what happened..."
              className="w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none h-24"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{text.length}/500</span>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || sending}
                size="sm"
                className="bg-brand-500 hover:bg-brand-600"
              >
                {sending ? "Sending..." : <><Send className="h-3.5 w-3.5 mr-1.5" /> Send</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
