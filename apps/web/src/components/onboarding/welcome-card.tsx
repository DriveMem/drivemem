"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Upload, Terminal, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

export function WelcomeCard({ onUpload }: { onUpload: () => void }) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/users/me/profile")
      .then((profile: any) => {
        if (!profile?.onboardingCompleted) setVisible(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dismiss = () => {
    setVisible(false)
    apiFetch("/api/users/me/onboarding", {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
    }).catch(() => {})
  }

  if (loading || !visible) return null

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 relative animate-in fade-in duration-300">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="text-lg font-semibold mb-1">
        👋 Welcome! Your demo project is ready.
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        We&apos;ve added some sample files so you can explore right away. Try asking a question in Chat.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push("/chat?new=1")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4" />
          Ask AI about your knowledge
        </button>
        <Link
          href="/developers"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition"
        >
          <Terminal className="h-4 w-4" />
          Connect your AI tools
        </Link>
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition"
        >
          <Upload className="h-4 w-4" />
          Upload your first document
        </button>
      </div>
    </div>
  )
}
