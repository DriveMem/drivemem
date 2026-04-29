"use client"

/**
 * Layer 3: Full-Page Error
 * - Replaces entire content area (preserves navbar)
 * - Error illustration + message + [Refresh Page] + [Go to Dashboard]
 * - 503 special: "Service maintenance" + auto-retry countdown
 */

import { useState, useEffect, useCallback } from "react"
import { ServerCrash, WifiOff, AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface FullPageErrorProps {
  statusCode?: number
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

const STATUS_CONFIG: Record<number, { icon: typeof ServerCrash; title: string; description: string }> = {
  503: {
    icon: ServerCrash,
    title: "Service maintenance, please retry later",
    description: "The service is temporarily unavailable. We'll automatically retry for you.",
  },
  500: {
    icon: ServerCrash,
    title: "Server error",
    description: "Something went wrong on our end. Please try again.",
  },
  404: {
    icon: AlertTriangle,
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been moved.",
  },
  0: {
    icon: WifiOff,
    title: "No internet connection",
    description: "Please check your network connection and try again.",
  },
}

const DEFAULT_CONFIG = {
  icon: AlertTriangle,
  title: "Something went wrong",
  description: "An unexpected error occurred. Please try again.",
}

export function FullPageError({ statusCode, title, description, onRetry, className }: FullPageErrorProps) {
  const config = statusCode ? STATUS_CONFIG[statusCode] || DEFAULT_CONFIG : DEFAULT_CONFIG
  const Icon = config.icon
  const is503 = statusCode === 503

  const [countdown, setCountdown] = useState(is503 ? 30 : 0)
  const [autoRetrying, setAutoRetrying] = useState(false)

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }, [onRetry])

  // Auto-retry countdown for 503
  useEffect(() => {
    if (!is503 || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setAutoRetrying(true)
          handleRetry()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [is503, countdown, handleRetry])

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-6",
      className,
    )}>
      {/* Error illustration */}
      <div className={cn(
        "flex h-20 w-20 items-center justify-center rounded-full",
        is503 ? "bg-amber-100 dark:bg-amber-900/20" : "bg-red-100 dark:bg-red-900/20",
      )}>
        <Icon className={cn(
          "h-10 w-10",
          is503 ? "text-amber-500" : "text-red-500",
        )} />
      </div>

      {/* Message */}
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-foreground">
          {title || config.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {description || config.description}
        </p>
      </div>

      {/* 503 auto-retry countdown */}
      {is503 && countdown > 0 && (
        <p className="text-sm text-muted-foreground">
          Auto-retrying in <span className="font-mono font-semibold text-foreground">{countdown}s</span>
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleRetry}
          disabled={autoRetrying}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", autoRetrying && "animate-spin")} />
          {autoRetrying ? "Retrying…" : "Refresh Page"}
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Error Boundary wrapper that catches React render errors
 * and shows FullPageError
 */
import React from "react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallbackStatusCode?: number
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <FullPageError
          statusCode={this.props.fallbackStatusCode}
          title="Something went wrong"
          description={this.state.error?.message || "An unexpected error occurred"}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}
