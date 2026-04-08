"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { FileText, Clock, Loader2, MessageCircle, Lightbulb, BarChart3 } from "lucide-react"
import Link from "next/link"

interface TimelineEvent {
  id: string
  type: "file_uploaded" | "conversation" | "insight" | "report"
  title: string
  subtitle?: string
  metadata?: Record<string, any>
  createdAt: string
}

const EVENT_CONFIG = {
  file_uploaded: {
    icon: FileText,
    label: "上传文件",
    dotColor: "bg-blue-500",
    iconColor: "text-blue-500",
  },
  conversation: {
    icon: MessageCircle,
    label: "AI 对话",
    dotColor: "bg-emerald-500",
    iconColor: "text-emerald-500",
  },
  insight: {
    icon: Lightbulb,
    label: "AI 洞察",
    dotColor: "bg-purple-500",
    iconColor: "text-purple-500",
  },
  report: {
    icon: BarChart3,
    label: "AI 报告",
    dotColor: "bg-orange-500",
    iconColor: "text-orange-500",
  },
}

function getEventLink(event: TimelineEvent): string {
  switch (event.type) {
    case "file_uploaded":
      return `/dashboard`
    case "conversation":
      return `/chat`
    case "insight":
      return `/dashboard`
    case "report":
      return `/dashboard`
    default:
      return `/dashboard`
  }
}

export default function TimelinePage() {
  useEffect(() => { document.title = "知识时间线 - AI Drive" }, [])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchEvents = async (newOffset: number) => {
    try {
      const data = await apiFetch(`/api/timeline?limit=50&offset=${newOffset}`) as any
      if (newOffset === 0) {
        setEvents(data.events || [])
      } else {
        setEvents(prev => [...prev, ...(data.events || [])])
      }
      setHasMore(data.hasMore || false)
      setOffset(newOffset + (data.events?.length || 0))
    } catch {
      // fallback: keep existing
    }
  }

  useEffect(() => {
    fetchEvents(0).finally(() => setLoading(false))
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    await fetchEvents(offset)
    setLoadingMore(false)
  }

  const groups: Record<string, TimelineEvent[]> = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  events.forEach(e => {
    const d = new Date(e.createdAt).toDateString()
    const label = d === today ? "今天" : d === yesterday ? "昨天" : new Date(e.createdAt).toLocaleDateString("zh-CN")
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">📅 知识时间线</h1>
      <p className="text-sm text-muted-foreground mb-8">你的 AI 知识活动全览</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">还没有知识活动</p>
          <p className="text-sm text-muted-foreground">上传文件、与 AI 对话，活动会自动出现在这里</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-4">{date}</h2>
              <div className="border-l-2 border-border pl-6 space-y-4">
                {items.map((event) => {
                  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.file_uploaded
                  const Icon = config.icon
                  return (
                    <div key={`${event.type}-${event.id}`} className="relative">
                      <div className={`absolute -left-[1.625rem] top-1 h-3 w-3 rounded-full ${config.dotColor} ring-4 ring-background`} />
                      <Link href={getEventLink(event)} className="block rounded-lg border p-4 hover:bg-accent/50 transition">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.iconColor}`} />
                          <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                        </div>
                        <p className="mt-1 font-medium text-sm">{event.title}</p>
                        {event.subtitle && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{event.subtitle}</p>
                        )}
                        {event.type === "insight" && event.metadata?.sourceFileName && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {event.metadata.sourceFileName} ↔ {event.metadata.relatedFileName}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(event.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-[#4F5BD5] hover:underline disabled:opacity-50"
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
