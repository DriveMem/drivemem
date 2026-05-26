"use client"

import { cn } from "@/lib/utils"

interface ContextUsageBarProps {
  percent: number
  used: number
  total: number
}

export function ContextUsageBar({ percent, used, total }: ContextUsageBarProps) {
  if (percent <= 0) return null

  const color = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-yellow-500" : "bg-brand-500"
  const textColor = percent >= 90 ? "text-red-600" : percent >= 70 ? "text-yellow-600" : "text-muted-foreground"

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
        <div className={cn("h-full rounded-full transition-all duration-300", color)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className={cn("text-[10px] font-mono", textColor)}>{percent}%</span>
    </div>
  )
}
