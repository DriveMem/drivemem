"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  type: "network" | "server" | "permission"
  onRetry?: () => void
}

const ERROR_CONFIG = {
  network: {
    icon: "🌐",
    title: "Network connection failed",
    description: "Please check your network connection and try again",
  },
  server: {
    icon: "⚠️",
    title: "Service temporarily unavailable",
    description: "Please try again later",
  },
  permission: {
    icon: "🔒",
    title: "No access",
    description: "You don't have permission to access this content",
  },
} as const

export function ErrorState({ type, onRetry }: ErrorStateProps) {
  const config = ERROR_CONFIG[type]

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
      <div className="text-4xl">{config.icon}</div>
      <p className="text-lg font-semibold">{config.title}</p>
      <p className="text-sm text-muted-foreground">{config.description}</p>
      <div className="mt-1">
        {type === "permission" ? (
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        ) : onRetry ? (
          <Button onClick={onRetry} variant="outline">Retry</Button>
        ) : null}
      </div>
    </div>
  )
}
