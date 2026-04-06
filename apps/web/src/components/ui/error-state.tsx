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
    title: "网络连接失败",
    description: "请检查网络连接后重试",
  },
  server: {
    icon: "⚠️",
    title: "服务暂时不可用",
    description: "请稍后重试",
  },
  permission: {
    icon: "🔒",
    title: "无权限访问",
    description: "你没有权限访问此内容",
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
            <Link href="/">返回首页</Link>
          </Button>
        ) : onRetry ? (
          <Button onClick={onRetry} variant="outline">重试</Button>
        ) : null}
      </div>
    </div>
  )
}
