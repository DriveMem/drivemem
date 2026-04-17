"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  FileText, Sparkles, Upload, X, Lightbulb, AlertTriangle,
  MessageCircle, Folder, Plus, ChevronRight, FolderPlus, Terminal, ArrowLeftRight
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MobileUploadFab } from "@/components/file/mobile-upload-fab"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { useFiles } from "@/hooks/use-files"
import { useFolders } from "@/hooks/use-folders"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { FileUpload } from "@/components/file/file-upload"
import Link from "next/link"
import { AutoSavedBar } from "@/components/dashboard/auto-saved-bar"

// --- helpers ---
function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return "just now"
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (date.toDateString() === now.toDateString()) return fmt(date)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${fmt(date)}`
  const days = Math.floor(diff / 86400000)
  if (days < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    return `${dayName} ${fmt(date)}`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// S3: Abbreviated time for mobile
function shortTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return "now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
function ActivityItem({ activity }: { activity: any }) {
  const isRelay = activity.type === 'agent_activity' && activity.metadata?.action === 'relay'
  const Icon = isRelay ? ArrowLeftRight : (activityIcons[activity.type] || Lightbulb)
  const isAgentActivity = activity.type === 'agent_activity'
  const rawAgent = activity.metadata?.agentName || activity.agentName
  const agentName = isAgentActivity && rawAgent && rawAgent !== "You"
    ? rawAgent.replace(/^agent[-_]?[a-z][-_]?/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'AI Agent'
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
      ? String(meta.fromAgent).replace(/^agent[-_]?[a-z][-_]?/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'AI Agent'
      : 'another agent'
    const fileName = meta.fileName || activity.detail || ''

    return (
      <div className="flex items-center gap-3 py-1.5 md:py-2.5 text-xs md:text-body border-b border-zinc-100 dark:border-zinc-800 last:border-0 border-l-2 border-l-indigo-400 dark:border-l-indigo-500 pl-2">
        <ArrowLeftRight className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 font-medium">{agentName}</span>
        <span className="text-zinc-900 dark:text-zinc-100 truncate">
          used knowledge from <span className="text-indigo-600 dark:text-indigo-400">{fromAgent}</span>
          {fileName && <span className="text-zinc-500 dark:text-zinc-400">: &ldquo;{fileName}&rdquo;</span>}
        </span>
        <span className="ml-auto text-[10px] md:text-caption text-muted-foreground flex-shrink-0 whitespace-nowrap">
          <span className="hidden md:inline">{relativeTime(activity.createdAt)}</span>
          <span className="md:hidden">{shortTime(activity.createdAt)}</span>
        </span>
      </div>
    )
  }

  const action = activity.title || ACTION_LABELS[activity.type] || activity.action || activity.type?.replace(/_/g, " ") || "activity"
  const detail = activity.message || activity.detail || ""

  return (
    <div className="flex items-center gap-3 py-1.5 md:py-2.5 text-xs md:text-body border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <Icon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
      <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">{agentName}</span>
      <span className="text-zinc-900 dark:text-zinc-100 truncate">
        {action}
        {detail && <span className="text-zinc-500 dark:text-zinc-400"> — {detail}</span>}
      </span>
      <span className="ml-auto text-[10px] md:text-caption text-muted-foreground flex-shrink-0 whitespace-nowrap">
        <span className="hidden md:inline">{relativeTime(activity.createdAt)}</span>
        <span className="md:hidden">{shortTime(activity.createdAt)}</span>
      </span>
    </div>
  )
}

// --- Project Chip ---
function ProjectChip({ project }: { project: any }) {
  return (
    <Link
      href={`/files?folderId=${project.id}`}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-body text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition whitespace-nowrap flex-shrink-0"
    >
      <Folder className="h-3.5 w-3.5" />
      {project.name}
      {project._count?.files != null && (
        <span className="text-xs text-zinc-400">{project._count.files}</span>
      )}
    </Link>
  )
}

// --- Resume Brief ---
function ResumeBrief({ brief, onDismiss }: { brief: any; onDismiss: () => void }) {
  return (
    <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Welcome back</h3>
        <button onClick={onDismiss} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
        You were away for {brief.hoursSinceActive}h. Here&apos;s what happened:
      </p>
      <div className="flex gap-4 text-xs text-zinc-600 dark:text-zinc-300">
        {brief.newFilesCount > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-zinc-400" /> {brief.newFilesCount} new files
          </span>
        )}
        {brief.newInsightsCount > 0 && (
          <span className="flex items-center gap-1">
            <Lightbulb className="h-3.5 w-3.5 text-zinc-400" /> {brief.newInsightsCount} new insights
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

// --- Auto-store grouping ---
function isAutoStoreActivity(a: any): boolean {
  return a.type === "auto_capture" || a.action === "auto_store" ||
    (a.metadata?.source === "auto_store")
}

function groupAutoStoreActivities(activities: any[]) {
  const result: any[] = []
  let currentGroup: any[] = []

  const flushGroup = () => {
    if (currentGroup.length === 0) return
    if (currentGroup.length === 1) {
      result.push(currentGroup[0])
    } else {
      result.push({
        isGroup: true,
        id: `group-${currentGroup[0].id}`,
        items: currentGroup,
        count: currentGroup.length,
        createdAt: currentGroup[0].createdAt,
      })
    }
    currentGroup = []
  }

  for (const a of activities) {
    if (isAutoStoreActivity(a)) {
      if (currentGroup.length > 0) {
        const lastTime = new Date(currentGroup[currentGroup.length - 1].createdAt).getTime()
        const thisTime = new Date(a.createdAt).getTime()
        if (Math.abs(lastTime - thisTime) > 5 * 60 * 1000) {
          flushGroup()
        }
      }
      currentGroup.push(a)
    } else {
      flushGroup()
      result.push(a)
    }
  }
  flushGroup()
  return result
}

// --- Auto Store Group Component ---
function AutoStoreGroup({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 py-1.5 md:py-2.5 text-xs md:text-body w-full text-left hover:bg-violet-50/50 dark:hover:bg-violet-950/20 rounded transition"
      >
        <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0" />
        <span className="text-violet-600 dark:text-violet-400 flex-shrink-0">AI</span>
        <span className="text-violet-700 dark:text-violet-300 truncate">
          saved {group.count} notes from your session
        </span>
        <ChevronRight className={`ml-auto h-3.5 w-3.5 text-violet-400 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        <span className="text-[10px] md:text-caption text-muted-foreground flex-shrink-0 whitespace-nowrap mr-1">
          <span className="hidden md:inline">{relativeTime(group.createdAt)}</span>
          <span className="md:hidden">{shortTime(group.createdAt)}</span>
        </span>
      </button>
      {expanded && (
        <div className="pl-7 pb-2 space-y-0.5">
          {group.items.map((a: any, i: number) => (
            <div key={a.id || i} className="flex items-center gap-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
              <span className="truncate">{a.title || a.detail || a.message || "Auto-saved note"}</span>
              <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
                {new Date(a.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Main Page ---
export default function HomePage() {
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)
  const { data: filesData } = useFiles()
  const { data: foldersData } = useFolders()

  const [activities, setActivities] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [resumeBrief, setResumeBrief] = useState<any>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [activityPage, setActivityPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [connectedAgents] = useState<any[]>([])

  useEffect(() => { document.title = "Home — DriveMem" }, [])

  // connectedAgents removed — banner now uses file/insight counts only

  // Fetch resume brief
  useEffect(() => {
    apiFetch("/api/resume-brief")
      .then((data: any) => { if (data?.show && data?.changes?.total > 0) setResumeBrief(data) })
      .catch(() => {})
  }, [])

  // Fetch conflicts
  useEffect(() => {
    apiFetch("/api/files/conflicts")
      .then((data: any) => {
        if (data?.conflicts?.length > 0) setConflicts(data.conflicts)
      })
      .catch(() => {})
  }, [])

  // Fetch insights count
  useEffect(() => {
    apiFetch("/api/insights?limit=5")
      .then((data: any) => setInsights(data?.insights || []))
      .catch(() => {})
  }, [])

  // Fetch activity feed (using timeline API)
  const fetchActivities = useCallback(async (page = 1) => {
    try {
      const data = await apiFetch(`/api/timeline?limit=20&page=${page}`) as any
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
          const data = await apiFetch("/api/notifications") as any
          const list = Array.isArray(data) ? data : data?.notifications || []
          setActivities(list.slice(0, 20))
          setHasMore(false)
        } catch {}
      }
    }
  }, [])

  useEffect(() => {
    fetchActivities(1)
  }, [fetchActivities])

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

  // Group auto_store activities
  const groupedActivities = groupAutoStoreActivities(activities)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <OnboardingFlow />
      <MobileUploadFab />
      <AutoSavedBar />
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}

      <div className="max-w-4xl mx-auto w-full px-6 py-8">
        {/* Status Banner */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10 mb-6">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            DriveMem is active · {fileCount} files indexed · {insightCount} insights
          </span>
        </div>

        {/* Resume Brief — conditional */}
        {resumeBrief && (
          <ResumeBrief brief={resumeBrief} onDismiss={() => setResumeBrief(null)} />
        )}

        {/* Conflict Warning — conditional */}
        {conflicts.length > 0 && <ConflictBanner count={conflicts.length} />}

        {/* Quick Actions — S1: icon-only on mobile with tooltips */}
        <TooltipProvider delayDuration={0}>
          <div className="flex gap-3 mb-8">
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

        {/* Value Summary */}
        <div className="rounded-2xl border shadow-soft p-6 mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">DriveMem is working for you</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{fileCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{fileCount === 1 ? "file" : "files"} indexed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{insightCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{insightCount === 1 ? "insight" : "insights"} discovered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{projectCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{projectCount === 1 ? "project" : "projects"}</p>
            </div>
          </div>
        </div>

        {/* Active Projects — horizontal scroll chips */}
        {folders.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-thin">
            {folders.map((p: any) => (
              <ProjectChip key={p.id} project={p} />
            ))}
            <button
              onClick={() => router.push("/files?newFolder=1")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 text-body text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 transition whitespace-nowrap flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        )}

        {/* Onboarding Guide Cards — show when no projects AND no files */}
        {projectCount === 0 && fileCount === 0 && (
          <div className="mb-8">
            <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-4">
              开始使用
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/files?newFolder=1")}
                className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition text-left"
              >
                <FolderPlus className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">创建你的第一个项目</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">用项目组织你的知识文件</div>
                </div>
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition text-left"
              >
                <Upload className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">上传第一份文件</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">支持文档、PDF、图片等格式</div>
                </div>
              </button>
              <button
                onClick={() => router.push("/chat?new=1")}
                className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition text-left"
              >
                <MessageCircle className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">试试 AI 对话</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">基于你的知识库智能问答</div>
                </div>
              </button>
              <Link
                href="/developers"
                className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition text-left"
              >
                <Terminal className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">用 CLI / MCP 连接</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">通过命令行或 API 接入知识库</div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <div>
          <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          {groupedActivities.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
              <p>暂无最近活动</p>
              <p className="mt-1">上传文件或开始对话后，活动会显示在这里。</p>
            </div>
          ) : (
            <div>
              {groupedActivities.map((entry: any, i: number) => (
                entry.isGroup
                  ? <AutoStoreGroup key={entry.id} group={entry} />
                  : <ActivityItem key={entry.id || i} activity={entry} />
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
        </div>
      </div>
    </div>
  )
}
