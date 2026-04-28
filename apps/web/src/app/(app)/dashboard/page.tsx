"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  FileText, Sparkles, Upload, X, Lightbulb, AlertTriangle,
  MessageCircle, Folder, Plus, ChevronRight, FolderPlus, Terminal, ArrowLeftRight, RefreshCw
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MobileUploadFab } from "@/components/file/mobile-upload-fab"
import { useFiles } from "@/hooks/use-files"
import { useFolders } from "@/hooks/use-folders"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { FileUpload } from "@/components/file/file-upload"
import Link from "next/link"
import { AutoSavedBar } from "@/components/dashboard/auto-saved-bar"
import { WorkItemsPanel } from "@/components/dashboard/work-items-panel"
import { WelcomeCard } from "@/components/onboarding/welcome-card"
import { DashboardSkeleton } from "@/components/ui/skeleton-loader"
import { ActivationBanner } from "@/components/dashboard/activation-banner"
import { SampleDataBanner } from "@/components/dashboard/sample-data-banner"
import { AgentActivityPanel } from "@/components/dashboard/agent-activity-panel"
import { MostReferencedPanel } from "@/components/dashboard/most-referenced-panel"
import { KnowledgeGapsPanel } from "@/components/dashboard/knowledge-gaps-panel"
import { WelcomeHero, WelcomeBanner } from "@/components/dashboard/welcome-hero"
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import { QuickStartChecklist } from "@/components/dashboard/quick-start-checklist"
import { computeBlockVisibility, computeChecklist } from "@/hooks/use-dashboard-phase"
import { useMcpSync } from "@/hooks/use-mcp-sync"
import { useRecentConversations } from "@/hooks/use-conversations"
import { relativeTime } from "@/lib/relative-time"
import { cleanSummary } from "@/lib/text-utils"

// S3: Abbreviated time for mobile
function shortTime(dateStr: string, now?: Date): string {
  const date = new Date(dateStr)
  const ref = now || new Date()
  const diff = ref.getTime() - date.getTime()
  if (diff < 60000) return "now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Hook: returns a stable "now" that is undefined during SSR,
 *  then set to Date on client. Re-ticks every 60s so relative times stay fresh. */
function useClientNow(intervalMs = 60_000): Date | undefined {
  const [now, setNow] = useState<Date | undefined>(undefined)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

const activityIcons: Record<string, typeof FileText> = {
  file_indexed: FileText,
  insight_generated: Sparkles,
  knowledge_link_found: Lightbulb,
  file_upload: Upload,
  conversation: MessageCircle,
  relay: ArrowLeftRight,
}

// --- Activity Item ---
function ActivityItem({ activity, now }: { activity: any; now?: Date }) {
  const isRelay = activity.type === 'agent_activity' && activity.metadata?.action === 'relay'
  const Icon = isRelay ? ArrowLeftRight : (activityIcons[activity.type] || Lightbulb)
  const isAgentActivity = activity.type === 'agent_activity'
  const isAutoCapture = activity.type === 'auto_capture'
  const isSystemGenerated = activity.type === 'insight' || activity.type === 'insight_generated' || activity.type === 'knowledge_link_found'
  const rawAgent = activity.metadata?.agentName || activity.agentName
  const hasAgentActor = activity.metadata?.actorType === 'agent' || isAgentActivity || isAutoCapture
  const agentName = isSystemGenerated
    ? "AI"
    : hasAgentActor && rawAgent && rawAgent !== "You"
      ? activity.metadata?.actorLabel || rawAgent.replace(/^agent[-_]?\w?[-_]?/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Agent'
      : hasAgentActor
        ? "Agent"
        : "You"
  const ACTION_LABELS: Record<string, string> = {
    file_indexed: "indexed a file",
    file_uploaded: "uploaded a file",
    insight_generated: "discovered an insight",
    knowledge_link_found: "found a knowledge connection",
    conversation: "had a conversation",
    file_upload: "uploaded",
    compile: "compiled a briefing",
    search: "searched knowledge",
    store: "stored a note",
    ask: "asked a question",
    relay: "used knowledge from another agent",
  }

  // Special relay formatting
  if (isRelay) {
    const meta = activity.metadata || {}
    const fromAgent = meta.fromAgent
      ? String(meta.fromAgent).replace(/^agent[-_]?\w?[-_]?/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'AI Agent'
      : 'another agent'
    const fileName = meta.fileName || activity.detail || ''

    return (
      <div className="flex items-center gap-3 py-1.5 md:py-2.5 text-xs md:text-body border-b border-zinc-100 dark:border-zinc-800 last:border-0 border-l-2 border-l-indigo-400 dark:border-l-indigo-500 pl-2">
        <ArrowLeftRight className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 font-medium">{agentName}</span>
        <span className="text-zinc-900 dark:text-zinc-100 truncate">
          used knowledge from <span className="text-indigo-600 dark:text-indigo-400">{fromAgent}</span>
          {fileName && <span className="text-zinc-500 dark:text-zinc-400">: &ldquo;{fileName.replace(/\.(md|txt|pdf|docx?)$/i, '')}&rdquo;</span>}
        </span>
        <span className="ml-auto text-micro md:text-caption text-muted-foreground flex-shrink-0 whitespace-nowrap">
          <span className="hidden md:inline" title={new Date(activity.createdAt).toLocaleString()}>{now ? relativeTime(activity.createdAt, now) : ""}</span>
          <span className="md:hidden" title={new Date(activity.createdAt).toLocaleString()}>{now ? shortTime(activity.createdAt, now) : ""}</span>
        </span>
      </div>
    )
  }

  const action = activity.title || ACTION_LABELS[activity.type] || activity.action || activity.type?.replace(/_/g, " ") || "activity"
  const rawDetail = activity.description || activity.message || activity.detail || ""
  // Friendlify note-YYYY-MM-DDTHH-MM-SS.md filenames to "AI Note"
  const detail = rawDetail
    .replace(/\bnote-\d{4}-\d{2}-\d{2}T[\d-]+\.md\b/g, 'AI Note')
    .replace(/\bsession-summary-[\w-]+\.md\b/g, 'Session Summary')
    .replace(/\bauto-capture-[\w-]+\.md\b/g, 'Auto Capture')
    .replace(/\bauto-[\w-]+\.md\b/g, 'Auto Note')
    .replace(/\.(md|pdf|docx|txt)\b/gi, '')

  // #100: Extract title (filename/action) as primary, detail as secondary
  const primaryTitle = (() => {
    const raw = activity.metadata?.fileName
      ? String(activity.metadata.fileName).replace(/\.(md|pdf|docx|txt)$/i, '')
      : activity.title || action
    // Humanize auto-generated filenames + strip AI meta-language
    return cleanSummary(raw)
      .replace(/^session-summary-[\w-]+$/i, 'Session Summary')
      .replace(/^auto-capture-[\w-]+$/i, 'Auto Capture')
      .replace(/^auto-[\w-]+$/i, 'Auto Note')
      .replace(/^note-\d{4}-\d{2}-\d{2}T[\w-]+$/i, 'Note')
  })()
  const secondaryDetail = activity.metadata?.fileName
    ? (detail || action)
    : detail

  const cleanDetail = secondaryDetail ? cleanSummary(secondaryDetail) : undefined

  return (
    <div className="flex items-start gap-3 py-2 md:py-3 text-xs md:text-body border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <Icon className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/60 flex-shrink-0">{agentName}</span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{primaryTitle}</span>
        </div>
        {cleanDetail && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/50 line-clamp-1">{cleanDetail}</p>
        )}
      </div>
      <span className="ml-auto text-micro md:text-caption text-muted-foreground/50 flex-shrink-0 whitespace-nowrap mt-0.5">
        <span className="hidden md:inline" title={new Date(activity.createdAt).toLocaleString()}>{now ? relativeTime(activity.createdAt, now) : ""}</span>
        <span className="md:hidden" title={new Date(activity.createdAt).toLocaleString()}>{now ? shortTime(activity.createdAt, now) : ""}</span>
      </span>
    </div>
  )
}

// --- Project Chip (card with quick prompt button) ---
function ProjectChip({ project }: { project: any }) {
  return (
    <div className="flex flex-col items-stretch rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 shadow-soft flex-shrink-0 min-w-[180px] max-w-[220px]">
      <Link
        href={`/files?folderId=${project.id}`}
        className="flex items-center gap-1.5 px-4 py-3 text-body text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition rounded-t-2xl"
      >
        <Folder className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{project.name}</span>
        {project._count?.files != null && (
          <span className="text-xs text-zinc-400 ml-auto flex-shrink-0">{project._count.files}</span>
        )}
      </Link>
      <Link
        href={`/chat?new=1&q=${encodeURIComponent('What are the key insights from my files?')}`}
        className="flex items-center gap-1.5 px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-primary hover:bg-primary/5 transition border-t border-zinc-100 dark:border-zinc-700 rounded-b-2xl"
      >
        ⚡ Ask AI about this project
      </Link>
    </div>
  )
}

// --- Since You Left Card (#41) ---
function ResumeBrief({ brief, onDismiss }: { brief: any; onDismiss: () => void }) {
  const handleDismiss = async () => {
    onDismiss()
    try { await apiFetch("/api/resume-brief/dismiss", { method: "POST", silent: true }) } catch {}
  }
  return (
    <div className="mb-6 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">✨ Since you left</h3>
        <button onClick={handleDismiss} className="text-indigo-300 hover:text-indigo-500 dark:hover:text-indigo-200 transition">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-indigo-500 dark:text-indigo-400 mb-3">
        You were away for {brief.hoursSinceActive}h. Here&apos;s what happened:
      </p>
      <div className="flex flex-wrap gap-4 text-xs font-medium">
        {brief.newFilesCount > 0 && (
          <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
            📁 {brief.newFilesCount} new {brief.newFilesCount === 1 ? 'file' : 'files'}
          </span>
        )}
        {brief.newInsightsCount > 0 && (
          <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
            💡 {brief.newInsightsCount} {brief.newInsightsCount === 1 ? 'insight' : 'insights'}
          </span>
        )}
        {brief.agentActivityCount > 0 && (
          <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
            🤖 {brief.agentActivityCount} agent {brief.agentActivityCount === 1 ? 'action' : 'actions'}
          </span>
        )}
      </div>
    </div>
  )
}

// --- Conflict Banner ---
function ConflictBanner({ count }: { count: number }) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{count} knowledge {count === 1 ? "conflict" : "conflicts"} detected</span>
      <Link href="/files?tab=conflicts" className="ml-auto text-xs font-medium underline hover:no-underline">
        Review
      </Link>
    </div>
  )
}

// --- Activity grouping: fold same-type activities within 1 minute (#99) ---
function getActivityMinuteKey(a: any): string {
  const d = new Date(a.createdAt)
  const min2 = Math.floor(d.getMinutes() / 2)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${min2}`
}

function getActivityTypeKey(a: any): string {
  if (a.type === 'file_uploaded' || a.type === 'auto_capture' || a.action === 'auto_store' || a.metadata?.source === 'auto_store') return 'file_mutation'
  if (a.type === 'agent_activity') return 'agent_activity'
  return a.type || 'unknown'
}

const GROUP_LABELS: Record<string, { verb: string; noun: string }> = {
  file_mutation: { verb: 'saved', noun: 'files' },
  file_indexed: { verb: 'indexed', noun: 'files' },
  file_upload: { verb: 'uploaded', noun: 'files' },
  insight_generated: { verb: 'generated', noun: 'insights' },
  knowledge_link_found: { verb: 'found', noun: 'connections' },
  conversation: { verb: 'had', noun: 'conversations' },
  agent_activity: { verb: 'performed', noun: 'actions' },
  unknown: { verb: 'performed', noun: 'actions' },
}

function groupActivitiesByMinuteAndType(activities: any[]) {
  const result: any[] = []
  let i = 0
  while (i < activities.length) {
    const a = activities[i]
    const typeKey = getActivityTypeKey(a)
    const minuteKey = getActivityMinuteKey(a)
    const group = [a]
    let j = i + 1
    while (j < activities.length) {
      const b = activities[j]
      if (getActivityTypeKey(b) === typeKey && getActivityMinuteKey(b) === minuteKey) {
        group.push(b)
        j++
      } else {
        break
      }
    }
    if (group.length >= 2) {
      const label = GROUP_LABELS[typeKey] || { verb: typeKey.replace(/_/g, ' '), noun: 'items' }
      result.push({
        isGroup: true,
        id: `group-${group[0].id}-${typeKey}`,
        items: group,
        count: group.length,
        createdAt: group[0].createdAt,
        typeKey,
        label,
      })
    } else {
      result.push(a)
    }
    i = j
  }
  return result
}

// --- Batch Activity Group Component (#99) ---
function BatchActivityGroup({ group, now }: { group: any; now?: Date }) {
  const [expanded, setExpanded] = useState(false)
  const label = group.label || { verb: 'processed', noun: 'items' }
  const Icon = activityIcons[group.typeKey] || Sparkles
  const timeStr = now
    ? new Date(group.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-3 py-2 md:py-3 text-xs md:text-body w-full text-left hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 rounded transition"
      >
        <Icon className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" />
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {group.count} {label.noun} {label.verb}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 text-zinc-400 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        <span className="ml-auto text-micro md:text-caption text-muted-foreground/50 flex-shrink-0 whitespace-nowrap mt-0.5">
          {timeStr}
        </span>
      </button>
      {expanded && (
        <div className="pl-7 pb-2 space-y-0.5">
          {group.items.map((a: any, i: number) => {
            const rawTitle = a.title || a.metadata?.fileName || a.detail || a.message || 'Activity'
            const rawDesc = a.description || a.message || ''
            const cleanDesc = rawTitle !== rawDesc ? rawDesc
              .replace(/^This (document|file|note|page|article|entry|memo|record|piece) (is about|describes|details|outlines|summarizes|covers|contains|provides|presents|discusses|explains|records|captures|announces|is a)[^.]*?\.\s*/i, '')
              .replace(/^(Here is|The following|Below is)[^.]*?\.\s*/i, '')
              .trim() : ''
            return (
              <div key={a.id || i} className="flex items-start gap-2 py-1 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0 mt-1.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate block">{rawTitle}</span>
                  {cleanDesc && (
                    <p className="text-[11px] text-muted-foreground/50 line-clamp-1">{cleanDesc}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Main Page ---
export default function HomePage() {
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)
  const { data: filesData, isLoading: filesLoading } = useFiles()
  const { data: foldersData, isLoading: foldersLoading } = useFolders()

  const [activities, setActivities] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [resumeBrief, setResumeBrief] = useState<any>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [staleCount, setStaleCount] = useState(0)
  const [staleFiles, setStaleFiles] = useState<any[]>([])
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [refreshResult, setRefreshResult] = useState<{ success: number; failed: number } | null>(null)
  const [activityPage, setActivityPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activityFilter, setActivityFilter] = useState<"all" | "files" | "conversations" | "agent">("all")
  const [connectedAgents] = useState<any[]>([])
  const [weeklyStats, setWeeklyStats] = useState<any>(null)
  const [quickPrompts, setQuickPrompts] = useState<{ text: string; icon?: string }[] | null>(null)
  const [quickPromptsLoading, setQuickPromptsLoading] = useState(true)
  const { data: recentConvsData } = useRecentConversations(1)
  const lastConversation = recentConvsData?.conversations?.[0] || null

  // Real-time MCP sync: toast when agents store/capture knowledge
  useMcpSync(true)

  useEffect(() => { document.title = "Home — DriveMem" }, [])

  // Fetch dynamic quick prompts
  const fetchQuickPrompts = useCallback(async () => {
    setQuickPromptsLoading(true)
    try {
      const data = await apiFetch("/api/quick-prompts", { silent: true }) as any
      if (data?.prompts?.length > 0) setQuickPrompts(data.prompts)
    } catch {
      // keep null → fallback to static
    } finally {
      setQuickPromptsLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuickPrompts() }, [fetchQuickPrompts])

  // connectedAgents removed — banner now uses file/insight counts only

  // Fetch weekly digest (silent — OK to fail)
  useEffect(() => {
    apiFetch("/api/v1/digest/weekly", { silent: true })
      .then((data: any) => setWeeklyStats(data))
      .catch(() => {})
  }, [])

  // Fetch resume brief
  useEffect(() => {
    apiFetch("/api/resume-brief", { silent: true })
      .then((data: any) => { if (data?.show) setResumeBrief(data) })
      .catch(() => {})
  }, [])

  // Fetch conflicts
  useEffect(() => {
    apiFetch("/api/files/conflicts", { silent: true })
      .then((data: any) => {
        if (data?.conflicts?.length > 0) setConflicts(data.conflicts)
      })
      .catch(() => {})
  }, [])

  // Fetch stale content count
  useEffect(() => {
    apiFetch("/api/files/stale", { silent: true })
      .then((data: any) => {
        if (data?.count > 0) setStaleCount(data.count)
        if (data?.staleFiles) setStaleFiles(data.staleFiles)
      })
      .catch(() => {})
  }, [])

  // Fetch insights count
  useEffect(() => {
    apiFetch("/api/insights?limit=5", { silent: true })
      .then((data: any) => setInsights(data?.insights || []))
      .catch(() => {})
  }, [])

  // Fetch activity feed (using timeline API)
  const fetchActivities = useCallback(async (page = 1, typeFilter = activityFilter) => {
    try {
      const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : ""
      const data = await apiFetch(`/api/timeline?limit=20&page=${page}${typeParam}`, { silent: true }) as any
      const items = data?.events || data?.activities || data?.notifications || []
      if (page === 1) {
        setActivities(items)
      } else {
        setActivities(prev => [...prev, ...items])
      }
      setHasMore(items.length >= 20)
    } catch {
      // Fallback to notifications API
      if (page === 1) {
        try {
          const data = await apiFetch("/api/notifications", { silent: true }) as any
          const list = Array.isArray(data) ? data : data?.notifications || []
          setActivities(list.slice(0, 20))
          setHasMore(false)
        } catch {}
      }
    }
  }, [activityFilter])

  useEffect(() => {
    setActivityPage(1)
    fetchActivities(1, activityFilter)
  }, [activityFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    setLoadingMore(true)
    const next = activityPage + 1
    await fetchActivities(next)
    setActivityPage(next)
    setLoadingMore(false)
  }

  const files = Array.isArray(filesData) ? filesData : (filesData as any)?.files || []
  const folders = foldersData?.folders || []
  const fileCount = files.filter((f: any) => f.status === "indexed").length
  const insightCount = insights.length
  const projectCount = folders.length

  // --- #66: Dashboard phase-based block visibility ---
  // Hydration-safe "now": undefined during SSR, set on client
  const clientNow = useClientNow()

  const hasAgentActivity = activities.some((a: any) => a.type === "agent_activity") || connectedAgents.length > 0
  const totalActivityCount = activities.length
  const hasAskedAi = (recentConvsData?.conversations?.length ?? 0) > 0
  const accountAgeDays = files.length > 0 && clientNow
    ? Math.floor((clientNow.getTime() - new Date(files[files.length - 1]?.createdAt || clientNow.getTime()).getTime()) / 86400000)
    : 0

  const blockVis = computeBlockVisibility({
    fileCount, hasAgentActivity, totalActivityCount, insightCount, accountAgeDays, hasAskedAi,
  })
  const checklist = computeChecklist({
    fileCount, hasAgentActivity, totalActivityCount, insightCount, accountAgeDays, hasAskedAi,
  })

  // Group auto_store activities, filter noise, dedup agent activity
  const cleanActivities = activities.filter((a: any) => {
    const msg = (a.message || a.title || '').toLowerCase()
    if (msg.includes('session idle') || msg.includes('idle summary')) return false
    if (msg.includes('session_summary')) return false
    if (activityFilter === "all" && blockVis.agentActivity && (a.type === 'agent_activity' || a.type === 'auto_capture')) return false
    return true
  })
  const groupedActivities = groupActivitiesByMinuteAndType(cleanActivities)

  if (filesLoading && foldersLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <MobileUploadFab />
      <AutoSavedBar />
      <ActivationBanner />
      <SampleDataBanner />
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}

      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 page-enter">
        {/* #66: Welcome Hero (Phase 1) or Banner (Phase 2) */}
        {blockVis.welcomeHero && <WelcomeHero onUpload={() => setShowUpload(true)} />}
        {blockVis.welcomeBanner && <WelcomeBanner />}
        {/* #66: Quick Start Checklist */}
        {blockVis.quickStartChecklist && <QuickStartChecklist checklist={checklist} onUpload={() => setShowUpload(true)} />}
        {/* Legacy Welcome Card — hidden when new hero/banner active */}
        {!blockVis.welcomeHero && !blockVis.welcomeBanner && <WelcomeCard onUpload={() => setShowUpload(true)} />}

        {/* Status Banner */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10 mb-6">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-body text-muted-foreground">
            DriveMem is active
            {fileCount > 0 && <> · {fileCount} {fileCount === 1 ? "file" : "files"}</>}
            {insightCount > 0 ? <> · {insightCount} {insightCount === 1 ? "insight" : "insights"}</> : fileCount > 0 ? <> · Upload more files to discover insights</> : null}
          </span>
        </div>

        {/* Resume Brief — conditional */}
        {resumeBrief && (
          <ResumeBrief brief={resumeBrief} onDismiss={() => setResumeBrief(null)} />
        )}

        {/* Conflict Warning — conditional */}
        {conflicts.length > 0 && <ConflictBanner count={conflicts.length} />}

        {/* Stale Content Warning — only show when > 3 outdated files */}
        {staleCount > 3 && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-4 py-3 text-sm text-orange-800 dark:text-orange-200">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{staleCount} {staleCount === 1 ? "file" : "files"} haven&apos;t synced in over 7 days</span>
            <div className="ml-auto flex items-center gap-2">
              {refreshState === 'idle' && (
                <button
                  onClick={async () => {
                    setRefreshState('loading')
                    try {
                      const data = await apiFetch("/api/files/stale/refresh-all", { method: "POST", silent: true }) as any
                      setRefreshResult({ success: data?.success ?? 0, failed: data?.failed ?? 0 })
                      setRefreshState('done')
                      setTimeout(() => { setStaleCount(0); setRefreshState('idle'); setRefreshResult(null) }, 3000)
                    } catch {
                      setRefreshState('idle')
                    }
                  }}
                  className="text-xs font-medium bg-orange-200 dark:bg-orange-800 hover:bg-orange-300 dark:hover:bg-orange-700 px-3 py-1 rounded-md transition-colors"
                >
                  Refresh All
                </button>
              )}
              {refreshState === 'loading' && (
                <span className="text-xs flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Refreshing…
                </span>
              )}
              {refreshState === 'done' && refreshResult && (
                <span className="text-xs">✓ {refreshResult.success} refreshed{refreshResult.failed > 0 ? ` / ${refreshResult.failed} failed` : ''}</span>
              )}
              <Link href="/files?filter=stale" className="text-xs font-medium underline hover:no-underline">
                Review
              </Link>
            </div>
          </div>
        )}

        {/* Zero-config onboarding cards — show when user has few files */}
        {fileCount <= 5 && (
          <div className="space-y-4 mb-8">
            {/* Try asking */}
            <div className="rounded-2xl border shadow-soft p-6">
              <h3 className="font-semibold mb-2">💬 Try asking DriveMem</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We&apos;ve added sample files so you can try it now. Click a question below to see DriveMem in action.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {quickPromptsLoading ? (
                  <>
                    <div className="h-10 w-56 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-10 w-48 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </>
                ) : (
                  (quickPrompts || [
                    { text: 'What decisions have been made?', icon: '🎯' },
                    { text: 'What are the key insights from my files?', icon: '⚡' },
                  ]).slice(0, 3).map((p, i) => (
                    <Link
                      key={i}
                      href={`/chat?new=1&q=${encodeURIComponent(p.text)}`}
                      className={i === 0
                        ? "inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-soft active:scale-[0.98] transition-all"
                        : "inline-flex items-center gap-2 rounded-xl border border-primary/20 text-primary px-4 py-2.5 text-sm font-medium hover:bg-primary/5 active:scale-[0.98] transition-all"
                      }
                    >
                      {p.icon && <span>{p.icon}</span>}
                      {p.text}
                    </Link>
                  ))
                )}
                <button
                  onClick={() => fetchQuickPrompts()}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  title="Refresh suggestions"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${quickPromptsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Upload real files */}
            <div className="rounded-2xl border shadow-soft p-6">
              <h3 className="font-semibold mb-2">📄 Add your own knowledge</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a real document — meeting notes, a decision log, or project spec — and watch DriveMem make it searchable by AI.
              </p>
              <Button
                onClick={() => setShowUpload(true)}
                variant="outline"
                className="rounded-xl shadow-soft active:scale-[0.98]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload a file
              </Button>
            </div>

            {/* Connect agents — subtle */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Connect your AI tools (Cursor, Claude, ChatGPT) to give them shared memory
                </p>
                <Link
                  href="/developers"
                  className="text-sm text-primary hover:underline whitespace-nowrap ml-4"
                >
                  Connect →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions — S1: icon-only on mobile with tooltips */}
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-wrap gap-3 mb-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => router.push("/chat?new=1")}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden md:inline">Ask AI</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="md:hidden">Ask AI</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden md:inline">Upload</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="md:hidden">Upload</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <Link href="/files">
                    <Folder className="h-4 w-4" />
                    <span className="hidden md:inline">Browse Knowledge</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="md:hidden">Browse Knowledge</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Continue Last Conversation */}
        {lastConversation && (
          <Link
            href={`/chat/${lastConversation.id}`}
            className="flex items-center gap-3 mb-8 px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-100/50 dark:hover:bg-violet-900/30 transition group"
          >
            <MessageCircle className="h-5 w-5 text-violet-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-violet-900 dark:text-violet-100">Continue last conversation</div>
              <div className="text-xs text-violet-600 dark:text-violet-400 truncate mt-0.5">
                {lastConversation.title}{lastConversation.previewSnippet ? ` — ${lastConversation.previewSnippet}` : ''}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-violet-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>
        )}

        {/* Value Summary removed — file/insight counts now in Status Banner */}

        {/* Weekly Stats — connections + interactions only (files shown in banner) */}
        {weeklyStats && (weeklyStats.agentInteractions > 0 || weeklyStats.connectionsFound > 0) && (
          <div className="rounded-2xl border shadow-soft p-6 mb-8">
            <h3 className="text-title font-semibold mb-1">Getting smarter</h3>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
              {weeklyStats.connectionsFound > 0 ? (
                <span>{weeklyStats.connectionsFound} {weeklyStats.connectionsFound === 1 ? 'connection' : 'connections'} found</span>
              ) : (
                <span className="text-muted-foreground/60">Connections will appear as your knowledge grows</span>
              )}
              {weeklyStats.agentInteractions > 0 && (
                <span>{weeklyStats.agentInteractions} {weeklyStats.agentInteractions === 1 ? 'interaction' : 'interactions'}</span>
              )}
            </div>
          </div>
        )}

        {/* Active Projects — horizontal scroll chips */}
        {folders.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-thin">
            {folders.map((p: any) => (
              <ProjectChip key={p.id} project={p} />
            ))}
            {folders.length <= 3 && (
              <button
                onClick={() => { const name = prompt("Project name:"); if (name) { apiFetch("/api/folders", { method: "POST", body: JSON.stringify({ name }) }).then(() => { router.refresh(); window.location.reload(); }).catch(() => {}); } }}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 transition flex-shrink-0 min-w-[180px] max-w-[220px] px-4 py-5 gap-1.5 group cursor-pointer"
              >
                <Plus className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition" />
                <span className="text-sm text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition font-medium">Create a project</span>
                <span className="text-xs text-zinc-400/70 dark:text-zinc-500/70">Organize your files</span>
              </button>
            )}
            {folders.length > 3 && (
              <button
                onClick={() => { const name = prompt("Project name:"); if (name) { apiFetch("/api/folders", { method: "POST", body: JSON.stringify({ name }) }).then(() => { router.refresh(); window.location.reload(); }).catch(() => {}); } }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 text-body text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 transition whitespace-nowrap flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            )}
          </div>
        )}

        {/* Dashboard Empty State — show when no files */}
        {projectCount === 0 && fileCount === 0 && (
          <DashboardEmptyState onUpload={() => setShowUpload(true)} />
        )}

        {/* Work Items */}
        <WorkItemsPanel />

        {/* Agent Activity — only when has agent activity (#66) */}
        {blockVis.agentActivity && <AgentActivityPanel />}

        {/* Most Referenced Knowledge — citation tracking */}
        <MostReferencedPanel />

        {/* Knowledge Gaps — zero-result tracking */}
        <KnowledgeGapsPanel />

        {/* Activity Feed — only when total_activity >= 3 (#66) */}
        {blockVis.recentActivity && (<div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </h2>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              {([
                { key: "all", label: "All" },
                { key: "files", label: "Files" },
                { key: "conversations", label: "Conversations" },
                { key: "agent", label: "Agent" },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActivityFilter(tab.key)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    activityFilter === tab.key
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {groupedActivities.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
              <p>No recent activity</p>
              <p className="mt-1">Upload files or start a conversation to see activity here.</p>
            </div>
          ) : (
            <div>
              {groupedActivities.map((entry: any, i: number) => (
                entry.isGroup
                  ? <BatchActivityGroup key={entry.id} group={entry} now={clientNow} />
                  : <ActivityItem key={entry.id || i} activity={entry} now={clientNow} />
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mt-4 w-full py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          )}
        </div>)}
      </div>
    </div>
  )
}
