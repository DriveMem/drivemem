"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

const RELOAD_KEY = "__dm_reload_count"
const RELOAD_TS_KEY = "__dm_reload_ts"
const MAX_RELOADS = 2
const RESET_INTERVAL = 5 * 60 * 1000 // 5 minutes

function isStaleChunkError(error: Error): boolean {
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

async function clearCachesAndReload() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // ignore
  }
  window.location.reload()
}

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    if (isStaleChunkError(error)) {
      const count = getReloadCount()
      if (count < MAX_RELOADS) {
        incrementReloadCount()
        window.location.reload()
        return
      }
      setShowManual(true)
    }
  }, [error])

  if (showManual) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground p-6">
        <RefreshCw className="h-12 w-12 text-primary animate-pulse" />
        <h1 className="text-2xl font-bold">A new version is available</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Please clear your browser cache and refresh to get the latest version of DriveMem.
        </p>
        <Button onClick={clearCachesAndReload} size="lg">
          Clear cache and retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-bold">An error occurred</h1>
      <p className="text-sm text-muted-foreground">The page encountered a problem. Please refresh and try again</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Retry</Button>
        <Button variant="outline" onClick={() => window.location.href = "/"}>Back to home</Button>
      </div>
    </div>
  )
}
