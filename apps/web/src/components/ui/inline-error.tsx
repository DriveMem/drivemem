"use client"

/**
 * Layer 2: Inline Error
 * - Displayed near the operation that failed
 * - Light red background bar + error icon + message + [Retry] button
 * - Reusable across all pages
 */

import { useState } from "react"
import { AlertCircle, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InlineErrorProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function InlineError({ message, onRetry, onDismiss, className }: InlineErrorProps) {
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    if (!onRetry || retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-4 py-3",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
      <p className="flex-1 min-w-0 text-sm text-red-700 dark:text-red-400 truncate">{message}</p>
      {onRetry && (
        <Button
          onClick={handleRetry}
          variant="ghost"
          size="sm"
          disabled={retrying}
          className="shrink-0 gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/**
 * Chat-specific inline error for AI response timeout
 */
interface ChatTimeoutErrorProps {
  onRetry: () => void
  onCancel: () => void
}

export function ChatTimeoutError({ onRetry, onCancel }: ChatTimeoutErrorProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-3 py-2 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
      <span className="flex-1 text-red-700 dark:text-red-400">Response timed out</span>
      <Button
        onClick={onRetry}
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
      <Button
        onClick={onCancel}
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground hover:bg-muted"
      >
        Cancel
      </Button>
    </div>
  )
}
