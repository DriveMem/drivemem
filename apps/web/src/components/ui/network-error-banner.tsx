"use client"

import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export function NetworkErrorBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)

    // Check initial state
    if (typeof navigator !== "undefined" && !navigator.onLine) setOffline(true)

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-red-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>You&apos;re offline. Check your connection.</span>
    </div>
  )
}
