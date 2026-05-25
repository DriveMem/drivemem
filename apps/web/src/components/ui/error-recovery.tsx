"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorRecoveryProps {
  title: string
  reason?: string
  primaryAction?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
  errorCode?: string
  variant?: "inline" | "banner" | "card"
  className?: string
}

export function ErrorRecovery({
  title,
  reason,
  primaryAction,
  secondaryAction,
  errorCode,
  variant = "card",
  className,
}: ErrorRecoveryProps) {
  return (
    <div className={cn(
      "rounded-lg border p-4",
      variant === "banner" && "border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20",
      variant === "inline" && "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 p-3",
      variant === "card" && "border-border bg-muted/30",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn(
          "h-5 w-5 flex-shrink-0 mt-0.5",
          variant === "banner" ? "text-orange-500" : "text-red-500"
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {reason && <p className="text-xs text-muted-foreground mt-1">{reason}</p>}
          {(primaryAction || secondaryAction) && (
            <div className="flex items-center gap-2 mt-3">
              {primaryAction && (
                <Button size="sm" variant="default" onClick={primaryAction.onClick} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button size="sm" variant="ghost" onClick={secondaryAction.onClick} className="h-7 text-xs text-muted-foreground">
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
          {errorCode && <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">Error: {errorCode}</p>}
        </div>
      </div>
    </div>
  )
}
