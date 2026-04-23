"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react"

const RELOAD_KEY = "chunk-reload-count"
const RELOAD_TS_KEY = "chunk-reload-ts"
const MAX_RELOADS = 2
const RESET_INTERVAL = 5 * 60 * 1000 // 5 minutes

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message || ""
  const name = error?.name || ""
  return (
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    (name === "ReferenceError" && msg.includes("before initialization")) ||
    (name === "TypeError" && (
      msg.includes("is not a function") ||
      msg.includes("Cannot read properties of undefined") ||
      msg.includes("is not a constructor") ||
      msg.includes("Failed to fetch")
    ))
  )
}

function getReloadCount(): number {
  try {
    const ts = Number(sessionStorage.getItem(RELOAD_TS_KEY) || "0")
    if (Date.now() - ts > RESET_INTERVAL) {
      sessionStorage.removeItem(RELOAD_KEY)
      sessionStorage.removeItem(RELOAD_TS_KEY)
      return 0
    }
    return Number(sessionStorage.getItem(RELOAD_KEY) || "0")
  } catch {
    return 0
  }
}

function incrementReloadCount(): void {
  try {
    const count = getReloadCount()
    sessionStorage.setItem(RELOAD_KEY, String(count + 1))
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

async function clearCacheAndReload() {
  try {
    // Clear app-related localStorage keys (preserve auth)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !key.startsWith("auth") && !key.startsWith("supabase")) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))

    // Clear sessionStorage
    sessionStorage.clear()

    // Clear Cache API
    if ("caches" in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // ignore
  }
  window.location.reload()
}

function ErrorFallbackUI() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground p-6">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        The page encountered an error while loading. Please try one of the options below.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()} size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Page
        </Button>
        <Button onClick={clearCacheAndReload} variant="outline" size="lg">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Cache &amp; Refresh
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        If the problem persists, please contact support.
      </p>
    </div>
  )
}

export default function Error({ error }: { error: Error; reset: () => void }) {
  const [showManual, setShowManual] = useState(false)
  const [isChunkError, setIsChunkError] = useState(false)

  useEffect(() => {
    if (isChunkLoadError(error)) {
      const count = getReloadCount()
      if (count < MAX_RELOADS) {
        incrementReloadCount()
        window.location.reload()
        return
      }
      setIsChunkError(true)
      setShowManual(true)
    } else {
      setShowManual(true)
    }
  }, [error])

  if (!showManual) {
    // Still attempting auto-reload, show nothing
    return null
  }

  return <ErrorFallbackUI />
}
