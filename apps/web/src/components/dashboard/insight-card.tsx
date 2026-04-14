"use client"
import { cn } from "@/lib/utils"
import { Lightbulb, AlertTriangle, TrendingUp, FileText } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

const typeConfig = {
  correlation: { icon: Lightbulb, label: "Correlation found", color: "text-amber-500", bg: "bg-amber-500/10" },
  contradiction: { icon: AlertTriangle, label: "Contradiction detected", color: "text-red-500", bg: "bg-red-500/10" },
  trend: { icon: TrendingUp, label: "Trend identified", color: "text-green-500", bg: "bg-green-500/10" },
}

interface Insight {
  id: string
  sourceFileId: string
  sourceFileName: string
  relatedFileId: string
  relatedFileName: string
  type: "correlation" | "contradiction" | "trend"
  title: string
  description: string
  similarityScore: number
  read: boolean
  createdAt: string
}

export function InsightCard({ insight, onRead }: { insight: Insight; onRead?: () => void }) {
  const config = typeConfig[insight.type] || typeConfig.correlation
  const Icon = config.icon

  const handleClick = async () => {
    if (!insight.read) {
      try {
        await apiFetch(`/api/insights/${insight.id}/read`, { method: "PATCH" })
        onRead?.()
      } catch {}
    }
  }

  return (
    <Link
      href={`/chat?q=Compare "${insight.sourceFileName}" and "${insight.relatedFileName}"&fileIds=${insight.sourceFileId},${insight.relatedFileId}`}
      onClick={handleClick}
      className={cn(
        "block rounded-xl border p-4 hover:shadow-md transition-all duration-150",
        !insight.read && "border-[#4F5BD5]/20 bg-[#4F5BD5]/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("shrink-0 rounded-lg p-2", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
            {!insight.read && <span className="h-2 w-2 rounded-full bg-[#4F5BD5]" />}
          </div>
          <p className="mt-1 text-sm font-medium text-foreground line-clamp-1">{insight.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{insight.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span className="truncate">{insight.sourceFileName}</span>
            <span>↔</span>
            <span className="truncate">{insight.relatedFileName}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
