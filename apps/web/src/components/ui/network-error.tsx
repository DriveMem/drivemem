"use client"

import { useState } from "react"
import { WifiOff, ServerCrash, RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type NetworkErrorType = "offline" | "server" | "timeout" | "unknown"

interface NetworkErrorProps {
  /** inline: 嵌入内容区域; fullpage: 全页居中 */
  mode?: "inline" | "fullpage"
  type?: NetworkErrorType
  message?: string
  onRetry?: () => void
  className?: string
}

const ERROR_CONFIG: Record<NetworkErrorType, { icon: typeof WifiOff; title: string; description: string; color: string }> = {
  offline: {
    icon: WifiOff,
    title: "网络连接失败",
    description: "请检查你的网络连接后重试",
    color: "text-yellow-500",
  },
  server: {
    icon: ServerCrash,
    title: "服务暂时不可用",
    description: "服务器遇到问题，请稍后重试",
    color: "text-red-500",
  },
  timeout: {
    icon: AlertTriangle,
    title: "请求超时",
    description: "服务器响应时间过长，请重试",
    color: "text-orange-500",
  },
  unknown: {
    icon: AlertTriangle,
    title: "出了点问题",
    description: "请稍后重试",
    color: "text-muted-foreground",
  },
}

/** 根据错误信息推断错误类型 */
export function classifyError(error: unknown): NetworkErrorType {
  if (!navigator.onLine) return "offline"
  const msg = error instanceof Error ? error.message : String(error)
  const lower = msg.toLowerCase()
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network")) return "offline"
  if (lower.includes("timeout") || lower.includes("aborted")) return "timeout"
  if (lower.includes("5") && /\b5\d{2}\b/.test(msg)) return "server"
  if (lower.includes("internal server") || lower.includes("bad gateway") || lower.includes("service unavailable")) return "server"
  return "unknown"
}

export function NetworkError({ mode = "inline", type = "unknown", message, onRetry, className }: NetworkErrorProps) {
  const [retrying, setRetrying] = useState(false)
  const config = ERROR_CONFIG[type]
  const Icon = config.icon

  const handleRetry = async () => {
    if (!onRetry || retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  if (mode === "fullpage") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-center p-6", className)}>
        <div className={cn("flex h-16 w-16 items-center justify-center rounded-full bg-muted", config.color)}>
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-semibold">{config.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{message || config.description}</p>
        </div>
        {onRetry && (
          <Button onClick={handleRetry} variant="outline" disabled={retrying} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
            {retrying ? "重试中..." : "重试"}
          </Button>
        )}
      </div>
    )
  }

  // inline mode
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3",
      className,
    )}>
      <Icon className={cn("h-5 w-5 shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{config.title}</p>
        <p className="text-xs text-muted-foreground truncate">{message || config.description}</p>
      </div>
      {onRetry && (
        <Button onClick={handleRetry} variant="ghost" size="sm" disabled={retrying} className="shrink-0 gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
          {retrying ? "重试中" : "重试"}
        </Button>
      )}
    </div>
  )
}
