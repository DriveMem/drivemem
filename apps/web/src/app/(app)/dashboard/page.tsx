"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  FileText, Sparkles, Upload, X, Lightbulb, AlertTriangle,
  MessageCircle, Folder, Plus, ChevronRight
} from "lucide-react"
import { MobileUploadFab } from "@/components/file/mobile-upload-fab"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { useFiles } from "@/hooks/use-files"
import { useFolders } from "@/hooks/use-folders"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { FileUpload } from "@/components/file/file-upload"
import Link from "next/link"

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

const activityIcons: Record<string, typeof FileText> = {
  file_indexed: FileText,
  insight_generated: Sparkles,
  knowledge_link_found: Lightbulb,
  file_upload: Upload,
  conversation: MessageCircle,
}

// --- Activity Item ---
function ActivityItem({ activity }: { activity: any }) {
  const Icon = activityIcons[activity.type] || Lightbulb
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
  }
  const action = activity.title || ACTION_LABELS[activity.type] || activity.action || activity.type?.replace(/_/g, " ") || "activity"
  const detail = activity.message || activity.detail || ""

  return (
    <div className="flex items-center gap-3 py-2.5 text-body border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <Icon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
      <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">{agentName}</span>
      <span className="text-zinc-900 dark:text-zinc-100 truncate">
        {action}
        {detail && <span className="text-zinc-500 dark:text-zinc-400"> — {detail}</span>}
      </span>
      <span className="ml-auto text-caption text-muted-foreground flex-shrink-0 whitespace-nowrap">
        {relativeTime(activity.createdAt)}
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

  useEffect(() => { document.title = "Home — DriveMem" }, [])

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
  const fileCount = files.length
  const insightCount = insights.length
  const projectCount = folders.length

  return (
    <div className="flex flex-col h-full overflow-auto">
      <OnboardingFlow />
      <MobileUploadFab />
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}

      <div className="max-w-4xl mx-auto w-full px-6 py-8">
        {/* Resume Brief — conditional */}
        {resumeBrief && (
          <ResumeBrief brief={resumeBrief} onDismiss={() => setResumeBrief(null)} />
        )}

        {/* Conflict Warning — conditional */}
        {conflicts.length > 0 && <ConflictBanner count={conflicts.length} />}

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/chat?new=1")}
          >
            <MessageCircle className="h-4 w-4" />
            Ask AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            asChild
          >
            <Link href="/files">
              <Folder className="h-4 w-4" />
              Browse Knowledge
            </Link>
          </Button>
        </div>

        {/* Knowledge Stats — compact row */}
        <div className="flex items-center gap-6 mb-8 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
          <span className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            {insightCount} {insightCount === 1 ? "insight" : "insights"}
          </span>
          <span className="flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5" />
            {projectCount} {projectCount === 1 ? "project" : "projects"}
          </span>
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

        {/* Activity Feed */}
        <div>
          <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          {activities.length === 0 ? (
            fileCount === 0 ? (
              <div className="text-center py-16">
                <Upload className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Your knowledge base is empty</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Upload your first file to start building your AI memory
                </p>
                <Button
                  onClick={() => setShowUpload(true)}
                  className="rounded-xl shadow-soft active:scale-[0.98] transition-transform"
                >
                  Upload your first file
                </Button>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                <p>No recent activity yet.</p>
                <p className="mt-1">Upload files or start a conversation to get started.</p>
              </div>
            )
          ) : (
            <div>
              {activities.map((a: any, i: number) => (
                <ActivityItem key={a.id || i} activity={a} />
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
