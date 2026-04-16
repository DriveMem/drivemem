"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { FileText, Clock, Loader2, MessageCircle, Lightbulb, BarChart3, Bot, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SwimlaneView } from "@/components/flow/swimlane-view"

// ── Flow View Types ──
interface ActivityFlowData {
  agents: Record<string, FlowActivity[]>
  flows: Array<{ from: string; to: string; fileCount: number; timestamp: string }>
  totalActivities: number
}

interface FlowActivity {
  id: string
  action: string
  detail: string | null
  createdAt: string
  relatedFileIds: string[] | null
  metadata: Record<string, any> | null
}

// ── List View Types (existing) ──
interface TimelineEvent {
  id: string
  type: "file_uploaded" | "conversation" | "insight" | "report" | "agent_activity" | "auto_capture"
  title: string
  description?: string
  subtitle?: string
  metadata?: Record<string, any>
  createdAt: string
}

const EVENT_CONFIG = {
  file_uploaded: { icon: FileText, label: "Upload files", dotColor: "bg-blue-500", iconColor: "text-blue-500" },
  conversation: { icon: MessageCircle, label: "AI Conversations", dotColor: "bg-emerald-500", iconColor: "text-emerald-500" },
  insight: { icon: Lightbulb, label: "AI Insights", dotColor: "bg-purple-500", iconColor: "text-purple-500" },
  report: { icon: BarChart3, label: "AI Report", dotColor: "bg-orange-500", iconColor: "text-orange-500" },
  agent_activity: { icon: Bot, label: "Agent Activity", dotColor: "bg-cyan-500", iconColor: "text-cyan-500" },
  auto_capture: { icon: FileText, label: "Auto Captured", dotColor: "bg-fuchsia-500", iconColor: "text-fuchsia-500" },
}

function getEventLink(event: TimelineEvent): string {
  switch (event.type) {
    case "file_uploaded": return `/files?highlight=${event.metadata?.fileId || event.id}`
    case "conversation": return `/chat/${event.metadata?.conversationId || event.id}`
    case "insight": return `/dashboard#insights`
    case "report": return `/dashboard#reports`
    default: return `/dashboard`
  }
}




// ── List View Component (existing timeline) ──
function ListView() {
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
      // fallback
    }
  }

  useEffect(() => { fetchEvents().finally(() => setLoading(false)) }, [])

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

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { type: null, label: "All" },
          { type: "file_uploaded", label: "📄 Upload" },
          { type: "conversation", label: "💬 Conversations" },
          { type: "insight", label: "💡 Insights" },
          { type: "report", label: "📊 Report" },
          { type: "agent_activity", label: "🤖 Agent" },
          { type: "auto_capture", label: "🧲 Auto Capture" },
        ].map(f => (
          <button
            key={f.type || "all"}
            onClick={() => setTypeFilter(f.type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              typeFilter === f.type ? "bg-white/[0.10] text-white" : "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📡</div>
          <p className="text-gray-400 font-medium mb-2">No activity yet</p>
          <p className="text-sm text-gray-500 mb-6">When agents interact with your knowledge base, their activity will appear here.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/developers">
              <Button variant="default" size="sm" className="gap-1.5">
                <Bot className="w-4 h-4" />
                Connect an agent
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="w-4 h-4" />
                Upload files
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-sm font-medium text-gray-400 mb-4">{date}</h2>
              <div className="border-l-2 border-white/[0.06] pl-6 space-y-4">
                {items.map((event) => {
                  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.file_uploaded
                  const Icon = config.icon
                  return (
                    <div key={`${event.type}-${event.id}`} className="relative">
                      <div className={`absolute -left-[1.625rem] top-1 h-3 w-3 rounded-full ${config.dotColor} ring-4 ring-background`} />
                      <Link href={getEventLink(event)} className="block cursor-pointer rounded-lg border border-white/[0.06] p-4 hover:bg-white/[0.05] hover:shadow-sm hover:border-white/[0.06]/80 transition-all duration-200">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.iconColor}`} />
                          <span className="text-xs font-medium text-gray-400">{config.label}</span>
                        </div>
                        <p className="mt-1 font-medium text-sm">{event.title}</p>
                        {(event.description || event.subtitle) && (
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{event.description || event.subtitle}</p>
                        )}
                        {event.type === "insight" && event.metadata?.sourceFileName && (
                          <p className="mt-1 text-xs text-gray-400">
                            {event.metadata.sourceFileName} ↔ {event.metadata.relatedFileName}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
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
              <button onClick={loadMore} disabled={loadingMore} className="text-sm text-gray-500 hover:text-gray-300 disabled:opacity-50">
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : events.length > 0 && (
            <div className="text-center py-6">
              {events.length < 10 ? (
                <>
                  <p className="text-sm text-gray-400 mb-1">🌱 This is the start of your knowledge journey</p>
                  <p className="text-xs text-gray-400">Continue uploading files, chat with AI, and your timeline will grow richer</p>
                </>
              ) : (
                <p className="text-xs text-gray-400">— Reached earliest record —</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Main Page ──
export default function TimelinePage() {
  const [view, setView] = useState<'flow' | 'list'>('flow')
  const [flowData, setFlowData] = useState<ActivityFlowData | null>(null)
  const [flowLoading, setFlowLoading] = useState(true)
  const [flowError, setFlowError] = useState(false)

  useEffect(() => {
    document.title = "Timeline — DriveMem"
    apiFetch('/api/timeline/activity-flow?limit=100')
      .then((data) => setFlowData(data as ActivityFlowData))
      .catch(() => setFlowError(true))
      .finally(() => setFlowLoading(false))
  }, [])

  // If flow API fails, fallback to list view
  const effectiveView = flowError ? 'list' : view

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">
          {effectiveView === 'flow' ? '🔀 Agent Activity Flow' : '📅 Timeline'}
        </h1>
        {!flowError && (
          <div className="flex gap-1">
            <Button
              variant="ghost" className={effectiveView === 'flow' ? 'bg-white/[0.10] text-white' : 'text-gray-400 hover:bg-white/[0.05]'}
              size="sm"
              onClick={() => setView('flow')}
            >
              Flow
            </Button>
            <Button
              variant="ghost" className={effectiveView === 'list' ? 'bg-white/[0.10] text-white' : 'text-gray-400 hover:bg-white/[0.05]'}
              size="sm"
              onClick={() => setView('list')}
            >
              List
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-6">
        {effectiveView === 'flow'
          ? 'See how information flows between agents through your knowledge base'
          : 'Track the complete history of file uploads, AI analysis, and knowledge discovery'}
      </p>

      {effectiveView === 'flow' ? (
        flowLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : flowData ? (
          <SwimlaneView data={flowData} />
        ) : (
          <div className="text-center py-12 text-gray-400">Failed to load flow data</div>
        )
      ) : (
        <ListView />
      )}
    </div>
  )
}
