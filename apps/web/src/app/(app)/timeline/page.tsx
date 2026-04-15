"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { FileText, Clock, Loader2, MessageCircle, Lightbulb, BarChart3 } from "lucide-react"
import Link from "next/link"

interface TimelineEvent {
  id: string
  type: "file_uploaded" | "conversation" | "insight" | "report"
  title: string
  description?: string
  subtitle?: string
  metadata?: Record<string, any>
  createdAt: string
}

const EVENT_CONFIG = {
  file_uploaded: {
    icon: FileText,
    label: "Upload files",
    dotColor: "bg-blue-500",
    iconColor: "text-blue-500",
  },
  conversation: {
    icon: MessageCircle,
    label: "AI Conversations",
    dotColor: "bg-emerald-500",
    iconColor: "text-emerald-500",
  },
  insight: {
    icon: Lightbulb,
    label: "AI Insights",
    dotColor: "bg-purple-500",
    iconColor: "text-purple-500",
  },
  report: {
    icon: BarChart3,
    label: "AI Report",
    dotColor: "bg-orange-500",
    iconColor: "text-orange-500",
  },
}

function getEventLink(event: TimelineEvent): string {
  switch (event.type) {
    case "file_uploaded": {
      const fileId = event.metadata?.fileId || event.id
      return `/files?highlight=${fileId}`
    }
    case "conversation": {
      const convId = event.metadata?.conversationId || event.id
      return `/chat/${convId}`
    }
    case "insight":
      return `/dashboard#insights`
    case "report":
      return `/dashboard#reports`
    default:
      return `/dashboard`
  }
}

export default function TimelinePage() {
  useEffect(() => { document.title = "Timeline - DriveMem" }, [])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const fetchEvents = async (cursor?: string | null) => {
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (cursor) params.set('cursor', cursor)
      const data = await apiFetch(`/api/timeline?${params}`) as any
      if (!cursor) {
        setEvents(data.events || [])
      } else {
        setEvents(prev => [...prev, ...(data.events || [])])
      }
      setHasMore(data.hasMore || false)
      setNextCursor(data.nextCursor || null)
    } catch {
      // fallback: keep existing
    }
  }

  useEffect(() => {
    fetchEvents().finally(() => setLoading(false))
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    await fetchEvents(nextCursor)
    setLoadingMore(false)
  }

  const filteredEvents = typeFilter ? events.filter(e => e.type === typeFilter) : events

  const groups: Record<string, TimelineEvent[]> = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  filteredEvents.forEach(e => {
    const d = new Date(e.createdAt).toDateString()
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(e.createdAt).toLocaleDateString("zh-CN")
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">📅 Knowledge Timeline</h1>
      <p className="text-sm text-muted-foreground mb-4">Track the complete history of file uploads, AI analysis, and knowledge discovery</p>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { type: null, label: "All" },
          { type: "file_uploaded", label: "📄 Upload" },
          { type: "conversation", label: "💬 Conversations" },
          { type: "insight", label: "💡 Insights" },
          { type: "report", label: "📊 Report" },
        ].map(f => (
          <button
            key={f.type || "all"}
            onClick={() => setTypeFilter(f.type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              typeFilter === f.type
                ? "bg-[#4F5BD5] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No knowledge activity yet</p>
          <p className="text-sm text-muted-foreground">Upload files、Chat with AI and activities will automatically appear here</p>
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
                      <Link href={getEventLink(event)} className="block cursor-pointer rounded-lg border p-4 hover:bg-accent/50 hover:shadow-md hover:border-border/80 transition-all duration-200">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.iconColor}`} />
                          <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                        </div>
                        <p className="mt-1 font-medium text-sm">{event.title}</p>
                        {(event.description || event.subtitle) && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{event.description || event.subtitle}</p>
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

          {hasMore ? (
            <div className="text-center py-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-[#4F5BD5] hover:underline disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : events.length > 0 && (
            <div className="text-center py-6">
              {events.length < 10 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-1">🌱 This is the start of your knowledge journey</p>
                  <p className="text-xs text-muted-foreground">Continue uploading files, chat with AI, and your timeline will grow richer</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">— Reached earliest record —</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
