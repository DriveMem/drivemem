"use client"
import { useState, useEffect } from "react"

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("drivemem_waitlist")) {
      setSubmitted(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || submitted) return
    setLoading(true)
    try {
      localStorage.setItem("drivemem_waitlist", email)
      setSubmitted(true)
    } catch {}
    setLoading(false)
  }

  if (submitted) {
    return (
      <p className="text-sm text-emerald-600 mt-4">
        ✅ You&apos;re on the list! We&apos;ll notify you when Pro launches.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto mt-4">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Join Waitlist"}
      </button>
    </form>
  )
}
