"use client"

/**
 * Layer 1: Singleton Error Toast
 * - Max 1 toast at a time (new replaces old)
 * - Top center, doesn't block bottom nav
 * - Auto-dismiss 5s
 * - Mobile: 90vw width, safe area top
 */

import { toast as sonnerToast } from "sonner"

let currentToastId: string | number | undefined

export type ErrorToastLevel = "error" | "warning" | "info" | "success"

interface ErrorToastOptions {
  level?: ErrorToastLevel
  duration?: number
  action?: { label: string; onClick: () => void }
}

/**
 * Show a singleton error toast. New calls dismiss the previous toast.
 */
export function showErrorToast(message: string, options: ErrorToastOptions = {}) {
  const { level = "error", duration = 5000, action } = options

  // Dismiss previous toast to enforce singleton
  if (currentToastId !== undefined) {
    sonnerToast.dismiss(currentToastId)
  }

  const toastFn =
    level === "error" ? sonnerToast.error :
    level === "warning" ? sonnerToast.warning :
    level === "success" ? sonnerToast.success :
    sonnerToast.info

  currentToastId = toastFn(message, {
    duration,
    action: action ? { label: action.label, onClick: action.onClick } : undefined,
  })

  return currentToastId
}

/**
 * Dismiss the current toast (if any)
 */
export function dismissErrorToast() {
  if (currentToastId !== undefined) {
    sonnerToast.dismiss(currentToastId)
    currentToastId = undefined
  }
}
