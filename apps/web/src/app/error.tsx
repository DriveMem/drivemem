"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Auto-reload on ChunkLoadError (stale deployment cache)
    if (error?.message?.includes('ChunkLoadError') || 
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch dynamically imported module')) {
      window.location.reload()
    }
  }, [error])

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
