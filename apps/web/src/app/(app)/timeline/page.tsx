"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { FileText, Clock, Loader2, MessageCircle, Lightbulb, BarChart3, Bot, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
  type: "file_uploaded" | "conversation" | "insight" | "report" | "agent_activity"
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

// Action icons & verbs for flow view
const actionIcons: Record<string, string> = { search: '🔍', store: '📥', ask: '💬', compile: '📋' }
const actionVerbs: Record<string, string> = { search: 'searched for', store: 'saved', ask: 'asked', compile: 'compiled briefing for' }

// Agent colors
const agentColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500', 'bg-pink-500', 'bg-yellow-500', 'bg-red-500']

function relativeTime(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ── Flow View Component ──
function FlowView({ data }: { data: ActivityFlowData }) {
  const agentNames = Object.keys(data.agents)

  if (agentNames.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No agent activity yet</p>
        <p className="text-sm text-muted-foreground">When agents interact with your knowledge base, their activity will appear here</p>
      </div>
    )
  }

  // Build a map of which fileIds belong to which agent (for flow indicators)
  const fileAgentMap: Record<string, string> = {}
  for (const [agent, activities] of Object.entries(data.agents)) {
    for (const a of activities) {
      if (a.action === 'store' && a.metadata?.fileId) {
        fileAgentMap[a.metadata.fileId as string] = agent
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Flow Summary */}
      {data.flows.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-[#4F5BD5]" />
            Information Flow
          </h3>
          <div className="space-y-2">
            {data.flows.map((flow, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{flow.from}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium text-foreground">{flow.to}</span>
                <span className="text-xs">({flow.fileCount} file{flow.fileCount !== 1 ? 's' : ''} shared)</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agent Cards */}
      {agentNames.map((agent, idx) => {
        const activities = data.agents[agent]
        const dotColor = agentColors[idx % agentColors.length]

        return (
          <Card key={agent} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-3 w-3 rounded-full ${dotColor}`} />
              <span className="font-semibold text-sm">🤖 {agent}</span>
              <span className="text-xs text-muted-foreground">{activities.length} action{activities.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {activities.map((a) => {
                const icon = actionIcons[a.action] || '📌'
                const verb = actionVerbs[a.action] || a.action

                // Check if this action used files from another agent
                let flowFrom: string | null = null
                if ((a.action === 'search' || a.action === 'compile') && a.relatedFileIds) {
                  for (const fid of a.relatedFileIds) {
                    const src = fileAgentMap[fid]
                    if (src && src !== agent) { flowFrom = src; break }
                  }
                }

                return (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">{verb}</span>{' '}
                      <span className="font-medium truncate">&quot;{a.detail || '...'}&quot;</span>
                      {flowFrom && (
                        <span className="ml-2 text-xs text-[#4F5BD5] bg-[#4F5BD5]/10 px-1.5 py-0.5 rounded">
                          ↑ from {flowFrom}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      {relativeTime(a.createdAt)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
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
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
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
        ].map(f => (
          <button
            key={f.type || "all"}
            onClick={() => setTypeFilter(f.type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              typeFilter === f.type ? "bg-[#4F5BD5] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No knowledge activity yet</p>
          <p className="text-sm text-muted-foreground">Upload files, Chat with AI and activities will automatically appear here</p>
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
              <button onClick={loadMore} disabled={loadingMore} className="text-sm text-[#4F5BD5] hover:underline disabled:opacity-50">
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
    document.title = "Information Flow - DriveMem"
    apiFetch('/api/v1/activity-flow?limit=100')
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
          {effectiveView === 'flow' ? '🔀 Information Flow' : '📅 Knowledge Timeline'}
        </h1>
        {!flowError && (
          <div className="flex gap-1">
            <Button
              variant={effectiveView === 'flow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('flow')}
            >
              Flow
            </Button>
            <Button
              variant={effectiveView === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              List
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {effectiveView === 'flow'
          ? 'See how information flows between agents through your knowledge base'
          : 'Track the complete history of file uploads, AI analysis, and knowledge discovery'}
      </p>

      {effectiveView === 'flow' ? (
        flowLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : flowData ? (
          <FlowView data={flowData} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">Failed to load flow data</div>
        )
      ) : (
        <ListView />
      )}
    </div>
  )
}
