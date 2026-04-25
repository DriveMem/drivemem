"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

const RELOAD_KEY = "chunk-reload-count"
const RELOAD_TS_KEY = "chunk-reload-ts"
const MAX_RELOADS = 2
const RESET_INTERVAL = 5 * 60 * 1000

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message || ""
  const name = error?.name || ""
  return (
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    (name === "ReferenceError" && msg.includes("before initialization")) ||
    (name === "TypeError" &&
      (msg.includes("is not a function") ||
        msg.includes("Cannot read properties of undefined") ||
        msg.includes("Failed to fetch")))
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
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !key.startsWith("auth") && !key.startsWith("supabase")) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
    sessionStorage.clear()
    if ("caches" in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // ignore
  }
  window.location.reload()
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    // Auto-reload for chunk load errors (with anti-loop)
    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const count = getReloadCount()
      if (count < MAX_RELOADS) {
        incrementReloadCount()
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The page encountered an error while loading. Please try one of the options below.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
            <Button onClick={clearCacheAndReload} variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cache & Refresh
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If the problem persists, please contact support.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
