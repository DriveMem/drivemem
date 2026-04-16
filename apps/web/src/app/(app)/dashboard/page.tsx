"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FolderOpen, Sparkles, Upload, X, Lightbulb, AlertTriangle, TrendingUp, MessageSquare, Folder, FileText, Search, Plug, PenLine, BarChart3 } from "lucide-react"
import { FileList } from "@/components/file/file-list"
import { MemoryOverview } from "@/components/dashboard/memory-overview"
import { KnowledgeLinks } from "@/components/dashboard/knowledge-links"
import { AiInsights } from "@/components/dashboard/ai-insights"
import { InsightCard } from "@/components/dashboard/insight-card"
import { ReportSection, type ReportSectionHandle } from "@/components/dashboard/report-section"
import { MobileUploadFab } from "@/components/file/mobile-upload-fab"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { useFiles } from "@/hooks/use-files"
import { useFolders, useCreateFolder } from "@/hooks/use-folders"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useLayoutStore } from "@/stores/layout-store"
import { toast } from "sonner"
import Link from "next/link"

// --- helpers ---
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const activityIcons: Record<string, typeof FileText> = {
  file_indexed: FileText,
  insight_generated: Sparkles,
  knowledge_link_found: Lightbulb,
}

// --- Quick Action Chips ---
function QuickActions({ onGenerate, onOrganize }: {
  onGenerate: (type: "analysis" | "study") => void
  onOrganize: () => void
}) {
  const router = useRouter()
  const chips: { icon: typeof MessageSquare; label: string; action: () => void }[] = [
    { icon: MessageSquare, label: "New AI Chat", action: () => router.push("/chat?new=1") },
    { icon: BarChart3, label: "Generate report", action: () => onGenerate("analysis") },
    { icon: PenLine, label: "Study notes", action: () => onGenerate("study") },
    { icon: Search, label: "AI organize", action: onOrganize },
  ]
  return (
    <div className="mx-3 mb-3 flex flex-wrap gap-2">
      {chips.map(c => (
        <button
          key={c.label}
          onClick={c.action}
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <c.icon className="h-3.5 w-3.5 text-zinc-400" />
          {c.label}
        </button>
      ))}
    </div>
  )
}

// --- Activity Summary ---
function ActivitySummary({ activities }: { activities: any[] }) {
  const fileCount = activities.filter(a => a.type === "file_indexed").length
  const insightCount = activities.filter(a => a.type === "insight_generated").length
  const linkCount = activities.filter(a => a.type === "knowledge_link_found").length
  const shown = activities.slice(0, 5)

  if (activities.length === 0) {
    return (
      <div className="mx-3 mb-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center text-sm text-zinc-400">
        AI will notify you when it discovers knowledge links
      </div>
    )
  }

  return (
    <div className="mx-3 mb-3">
      <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2.5">Recent activity</h4>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2.5">
        Indexed {fileCount} {fileCount === 1 ? 'file' : 'files'} · {insightCount} {insightCount === 1 ? 'insight' : 'insights'} · {linkCount} {linkCount === 1 ? 'link' : 'links'}
      </div>
      <div className="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
        {shown.map((a: any) => {
          const Icon = activityIcons[a.type] || Lightbulb
          return (
            <div key={a.id} className="flex items-center gap-2 text-sm truncate py-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate flex-1 text-zinc-600 dark:text-zinc-300">{a.title}</span>
              <span className="shrink-0 text-xs text-zinc-400" title={a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}>{a.createdAt ? relativeTime(a.createdAt) : ""}</span>
            </div>
          )
        })}
      </div>
      {activities.length > 5 && (
        <button className="mt-2 text-xs text-brand-500 hover:underline">View all</button>
      )}
    </div>
  )
}

// --- Insights summary card for files tab ---
const insightTypeIcon: Record<string, typeof Lightbulb> = {
  correlation: Lightbulb,
  contradiction: AlertTriangle,
  trend: TrendingUp,
}
const insightTypeColor: Record<string, string> = {
  correlation: "text-amber-500",
  contradiction: "text-red-500",
  trend: "text-green-500",
}

function InsightsSummaryCard({ insights, onSwitchToAi }: { insights: any[]; onSwitchToAi: () => void }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem("insights-card-dismissed") === "true")
    }
  }, [])

  if (dismissed || insights.length === 0) return null

  const unread = insights.filter(i => !i.read).length
  const count = unread > 0 ? unread : insights.length
  const label = unread > 0 ? `${count} new knowledge links` : `${count} knowledge links`
  const previews = insights.slice(0, 3)

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("insights-card-dismissed", "true")
  }

  return (
    <div className="mx-6 mb-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={onSwitchToAi} className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:underline">
          <Lightbulb className="h-4 w-4 text-brand-500" />
          AI discovered {label}
          <span className="text-xs text-brand-500">View →</span>
        </button>
        <button onClick={handleDismiss} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-1">
        {previews.map((i: any) => {
          const Icon = insightTypeIcon[i.type] || Lightbulb
          const color = insightTypeColor[i.type] || "text-amber-500"
          return (
            <div key={i.id} className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              <Icon className={cn("h-3 w-3 shrink-0", color)} />
              <span className="truncate">{i.title}</span>
              <span className="shrink-0">·</span>
              <span className="truncate">{i.sourceFileName} ↔ {i.relatedFileName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<"files" | "ai">("files")
  const { closeInspector, currentFolderId, setCurrentFolder } = useLayoutStore()

  const handleTabSwitch = (tab: "files" | "ai") => {
    setActiveTab(tab)
    closeInspector()
  }
  const { data: filesData } = useFiles()
  const { data: foldersData } = useFolders()
  const createFolder = useCreateFolder()
  const folders = foldersData?.folders || []
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [activities, setActivities] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [resumeBrief, setResumeBrief] = useState<any>(null)
  const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null)
  const reportRef = useRef<ReportSectionHandle>(null)

  useEffect(() => { document.title = "Dashboard — DriveMem" }, [])

  useEffect(() => {
    apiFetch("/api/resume-brief")
      .then((data: any) => { if (data?.show) setResumeBrief(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch('/api/api-keys').then((data: any) => setHasApiKeys(data?.keys?.length > 0)).catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch("/api/insights?limit=5").then((data: any) => {
      setInsights(data?.insights || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch("/api/notifications").then((data: any) => {
      const list = Array.isArray(data) ? data : data?.notifications || []
      setActivities(list.slice(0, 10))
    }).catch(() => {})
  }, [])

  const files = Array.isArray(filesData) ? filesData : (filesData as any)?.files || []
  const fileCount = files.length
  const unfiledCount = files.filter((f: any) => !f.folderId).length

  const handleQuickGenerate = (type: "analysis" | "study") => {
    reportRef.current?.generate(type)
  }

  const handleAutoOrganize = async () => {
    try {
      await apiFetch("/api/files/auto-organize", { method: "POST" })
      toast.success("File organization started")
    } catch {
      toast.error("File organization failed")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WelcomeModal onUpload={() => setShowUpload(true)} />
      <MobileUploadFab />

      {/* Tab switcher — pill/segment style */}
      <div className="px-6 pt-6 pb-2">
        <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1.5">
          <button
            onClick={() => handleTabSwitch("files")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-sm rounded-md transition-all duration-200",
              activeTab === "files"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            Files
          </button>
          <button
            onClick={() => handleTabSwitch("ai")}
            className={cn(
              "relative flex items-center gap-2 px-5 py-2 text-sm rounded-md transition-all duration-200",
              activeTab === "ai"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI Chat
            {fileCount > 3 && activeTab !== "ai" && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "files" ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {resumeBrief && (
            <div className="mx-6 mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Welcome back</h3>
                <button onClick={() => setResumeBrief(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                You were away for {resumeBrief.hoursSinceActive}h. Here&apos;s what happened:
              </p>
              <div className="flex gap-4 text-xs text-zinc-600 dark:text-zinc-300">
                {resumeBrief.newFilesCount > 0 && (
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-zinc-400" /> {resumeBrief.newFilesCount} new files</span>
                )}
                {resumeBrief.newInsightsCount > 0 && (
                  <span className="flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5 text-zinc-400" /> {resumeBrief.newInsightsCount} new insights</span>
                )}
                {resumeBrief.recentActivity.length > 0 && (
                  <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-zinc-400" /> {resumeBrief.recentActivity.length} agent actions</span>
                )}
              </div>
              {resumeBrief.recentActivity.length > 0 && (
                <div className="mt-2 space-y-1">
                  {resumeBrief.recentActivity.slice(0, 3).map((a: any, i: number) => (
                    <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400">
                      {a.agentName} {a.action === 'store' ? 'saved' : a.action === 'search' ? 'searched for' : a.action === 'compile' ? 'compiled' : a.action} &quot;{a.detail}&quot;
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <InsightsSummaryCard insights={insights} onSwitchToAi={() => handleTabSwitch("ai")} />
          {hasApiKeys === false && (
            <div className="mx-6 mb-4 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50/50 to-transparent p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                  <Plug className="h-5 w-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Connect Your AI Agent</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Let your agents access your knowledge base
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => router.push('/settings?tab=developer')} className="bg-brand-500 hover:bg-brand-600 text-white">
                      Create API Key
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => router.push('/developers')}>
                      View docs
                    </Button>
                  </div>
                  <a href="/developers" className="inline-block mt-2 text-xs text-muted-foreground hover:text-brand-500 hover:underline">
                    Learn more about agent integration →
                  </a>
                </div>
              </div>
            </div>
          )}
          {!currentFolderId ? (
            <div className="flex-1 min-h-0 overflow-auto p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder: any) => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-zinc-300 dark:hover:border-zinc-600 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
                        <Folder className="h-4 w-4 text-brand-500" />
                      </div>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{folder.name}</h3>
                      {folder.status && (
                        <span className={cn(
                          "ml-auto rounded-full px-2 py-0.5 text-[11px] tracking-wide uppercase font-medium",
                          folder.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          folder.status === 'completed' ? 'bg-brand-500/10 text-brand-500' :
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        )}>
                          {folder.status === 'active' ? 'Active' : folder.status === 'completed' ? 'Completed' : folder.status}
                        </span>
                      )}
                    </div>
                    {folder.brief && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">{folder.brief}</p>
                    )}
                    {folder.goal && (
                      <p className="text-xs text-brand-500 mb-2">{folder.goal}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="mx-0.5">·</span>
                        <span>{folder.fileCount ?? 0} {(folder.fileCount ?? 0) === 1 ? 'file' : 'files'}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/compile?project=${folder.id}`) }}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors hover:shadow-sm"
                      >
                        <Sparkles className="h-3 w-3" />
                        Compile
                      </button>
                    </div>
                  </div>
                ))}

                {/* New project card */}
                <div
                  onClick={() => { setNewFolderName(""); setFolderDialogOpen(true) }}
                  className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-5 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 text-zinc-400 hover:text-brand-500 min-h-[120px]"
                >
                  <span className="text-2xl font-light">+</span>
                  <span className="text-sm font-medium">New project</span>
                </div>
              </div>

              {/* Unfiled section */}
              {unfiledCount > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-zinc-400" /> Unfiled ({unfiledCount})
                  </h3>
                  <button onClick={() => router.push("/files")} className="text-sm text-brand-500 hover:underline">
                    View all files →
                  </button>
                </div>
              )}

              {/* Empty state guide */}
              {(folders.length === 0 || fileCount === 0) && (
                <div className="mt-8 bg-gradient-to-b from-zinc-50/50 to-transparent dark:from-zinc-800/30 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Get started</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => { handleTabSwitch("files"); setShowUpload(true) }}
                      className="flex items-start gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-5 text-left hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Upload your first file</p>
                        <p className="text-xs text-zinc-400 mt-1">PDF, docs, notes — AI indexes everything</p>
                      </div>
                    </button>
                    <button
                      onClick={() => router.push("/chat?new=1")}
                      className="flex items-start gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-5 text-left hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all duration-200"
                    >
                      <MessageSquare className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Try AI Chat</p>
                        <p className="text-xs text-zinc-400 mt-1">Ask questions, get cited answers</p>
                      </div>
                    </button>
                    <button
                      onClick={() => router.push("/developers")}
                      className="flex items-start gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-5 text-left hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all duration-200"
                    >
                      <Plug className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Connect via CLI / MCP</p>
                        <p className="text-xs text-zinc-400 mt-1">Let your AI assistant access your knowledge</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <FileList />
            </div>
          )}

          {/* New project dialog */}
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
              <Input
                placeholder="Project name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    createFolder.mutate({ name: newFolderName.trim() })
                    setFolderDialogOpen(false)
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      createFolder.mutate({ name: newFolderName.trim() })
                      setFolderDialogOpen(false)
                    }
                  }}
                  disabled={!newFolderName.trim()}
                >Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-1 animate-in fade-in duration-200">
          {fileCount === 0 ? (
            <div className="px-4 py-5 space-y-5">
              {/* Hero section */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
                  <Sparkles className="h-6 w-6 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">Upload files to start your AI knowledge base</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-5">
                  After uploading, AI will understand your content, build knowledge memory, and provide insights and cross-file analysis.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { handleTabSwitch("files"); setShowUpload(true) }}
                    className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition inline-flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload your first file
                  </button>
                  <button
                    onClick={() => router.push("/chat?new=1")}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition inline-flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Start a conversation
                  </button>
                </div>
              </div>

              {/* AI capabilities */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Search, title: "Semantic search", desc: "Search with natural language, AI understands intent not just keywords" },
                  { icon: MessageSquare, title: "AI Q&A", desc: "Ask questions, get cited answers from your files" },
                  { icon: Lightbulb, title: "Smart insights", desc: "Auto-discover connections, contradictions, and trends" },
                  { icon: BarChart3, title: "Analysis reports", desc: "Generate cross-file analysis, study notes, and comparisons" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                    <item.icon className="h-5 w-5 text-zinc-400 mb-2" />
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-0.5">{item.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Example questions */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Try these questions</h4>
                <div className="space-y-2">
                  {[
                    "Summarize the key points of this document",
                    "What contradictions exist between these two files?",
                    "Generate a study outline from my notes",
                    "Find all content mentioning competitive analysis",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => router.push(`/chat?q=${encodeURIComponent(q)}`)}
                      className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span className="text-zinc-500 dark:text-zinc-400">{q}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick entries */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => { handleTabSwitch("files"); setShowUpload(true) }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-3 hover:border-brand-400 hover:bg-brand-500/5 transition"
                >
                  <Upload className="h-5 w-5 text-brand-500" />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Upload files</span>
                </button>
                <Link
                  href="/chat"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-3 hover:border-brand-400 hover:bg-brand-500/5 transition"
                >
                  <MessageSquare className="h-5 w-5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">AI Chat</span>
                </Link>
                <Link
                  href="/developers"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-3 hover:border-brand-400 hover:bg-brand-500/5 transition"
                >
                  <FolderOpen className="h-5 w-5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">API Docs</span>
                </Link>
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-4">
                <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-3">How it works</h4>
                <div className="flex items-start gap-4">
                  {[
                    { step: "1", label: "Upload files", sub: "PDF, docs, notes, etc." },
                    { step: "2", label: "AI auto-indexes", sub: "Understands content and builds memory" },
                    { step: "3", label: "Get insights", sub: "Analysis, reports, Q&A" },
                  ].map((s) => (
                    <div key={s.step} className="flex-1 flex flex-col items-center text-center">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-500 mb-1.5">
                        {s.step}
                      </div>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{s.label}</span>
                      <span className="text-[11px] text-zinc-400 mt-0.5">{s.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <QuickActions onGenerate={handleQuickGenerate} onOrganize={handleAutoOrganize} />
              <MemoryOverview />

              {/* AI Reports section */}
              <div className="mx-4 mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Reports</h3>
                </div>
                <ReportSection ref={reportRef} />
              </div>

              {/* Divider */}
              <div className="mx-4 mb-4">
                <div className="border-t border-zinc-200 dark:border-zinc-800" />
              </div>

              {/* AI Insights section */}
              <div className="mx-4 mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Insights</h3>
                  {insights.filter(i => !i.read).length > 0 && (
                    <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] text-white">
                      {insights.filter(i => !i.read).length} new
                    </span>
                  )}
                </div>
                {insights.length > 0 ? (
                  <div className="space-y-3">
                    {insights.map(insight => (
                      <InsightCard key={insight.id} insight={insight} onRead={() => {
                        setInsights(prev => prev.map(i => i.id === insight.id ? { ...i, read: true } : i))
                      }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">AI will show insights when it discovers connections between files</p>
                )}
                {fileCount > 3 && (
                  <>
                    <AiInsights />
                    <KnowledgeLinks />
                  </>
                )}
              </div>

              <ActivitySummary activities={activities} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
