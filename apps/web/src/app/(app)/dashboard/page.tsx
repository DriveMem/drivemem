"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FolderOpen, Sparkles, Upload, X, Lightbulb, AlertTriangle, TrendingUp, MessageSquare } from "lucide-react"
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

function activityEmoji(type: string) {
  if (type === "file_indexed") return "📄"
  if (type === "insight_generated") return "✨"
  if (type === "knowledge_link_found") return "🔗"
  return "🔔"
}

// --- Quick Action Chips ---
function QuickActions({ onGenerate, onOrganize }: {
  onGenerate: (type: "analysis" | "study") => void
  onOrganize: () => void
}) {
  const router = useRouter()
  const chips: { icon: string; label: string; action: () => void }[] = [
    { icon: "💬", label: "New AI Chat", action: () => router.push("/chat?new=1") },
    { icon: "📊", label: "Generate report", action: () => onGenerate("analysis") },
    { icon: "📝", label: "Study notes", action: () => onGenerate("study") },
    { icon: "🔍", label: "AI organize", action: onOrganize },
  ]
  return (
    <div className="mx-3 mb-3 flex flex-wrap gap-2">
      {chips.map(c => (
        <button
          key={c.label}
          onClick={c.action}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#4F5BD5]/20 bg-[#4F5BD5]/5 px-3 py-1.5 text-sm hover:bg-[#4F5BD5]/10 transition"
        >
          <span>{c.icon}</span>{c.label}
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
      <div className="mx-3 mb-3 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        AI will notify you when it discovers knowledge links
      </div>
    )
  }

  return (
    <div className="mx-3 mb-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent activity</h4>
      <div className="text-xs text-muted-foreground mb-2">
        Indexed {fileCount} files · {insightCount}  insights · {linkCount}  links
      </div>
      <div className="space-y-1">
        {shown.map((a: any) => (
          <div key={a.id} className="flex items-center gap-2 text-sm truncate">
            <span className="shrink-0 text-xs">{activityEmoji(a.type)}</span>
            <span className="truncate flex-1">{a.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{a.createdAt ? relativeTime(a.createdAt) : ""}</span>
          </div>
        ))}
      </div>
      {activities.length > 5 && (
        <button className="mt-2 text-xs text-[#4F5BD5] hover:underline">View all</button>
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
  const label = unread > 0 ? `${count}  new knowledge links` : `${count}  knowledge links`
  const previews = insights.slice(0, 3)

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("insights-card-dismissed", "true")
  }

  return (
    <div className="mx-6 mb-3 rounded-xl border border-[#4F5BD5]/20 bg-[#4F5BD5]/5 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={onSwitchToAi} className="text-sm font-medium hover:underline">
          💡 AI discovered {label}
          <span className="ml-1.5 text-xs text-[#4F5BD5]">View →</span>
        </button>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-1">
        {previews.map((i: any) => {
          const Icon = insightTypeIcon[i.type] || Lightbulb
          const color = insightTypeColor[i.type] || "text-amber-500"
          return (
            <div key={i.id} className="flex items-center gap-2 text-xs text-muted-foreground truncate">
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
  const reportRef = useRef<ReportSectionHandle>(null)

  useEffect(() => { document.title = "Dashboard - DriveMem" }, [])

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

      {/* Tab switcher */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-1 border-b">
          <button
            onClick={() => handleTabSwitch("files")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition",
              activeTab === "files"
                ? "border-blue-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            Files
          </button>
          <button
            onClick={() => handleTabSwitch("ai")}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition",
              activeTab === "ai"
                ? "border-blue-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI Chat
            {fileCount > 3 && activeTab !== "ai" && (
              <span className="absolute top-1.5 right-1 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "files" ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <InsightsSummaryCard insights={insights} onSwitchToAi={() => handleTabSwitch("ai")} />
          {!currentFolderId ? (
            <div className="flex-1 min-h-0 overflow-auto p-6">
              <h2 className="text-lg font-semibold mb-4">📁 Projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder: any) => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className="rounded-xl border p-4 hover:shadow-md hover:border-[#4F5BD5]/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">📁</span>
                      <h3 className="font-medium truncate">{folder.name}</h3>
                      {folder.status && (
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          folder.status === 'active' ? 'bg-green-500/10 text-green-600' :
                          folder.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {folder.status === 'active' ? 'Active' : folder.status === 'completed' ? 'Completed' : folder.status}
                        </span>
                      )}
                    </div>
                    {folder.brief && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{folder.brief}</p>
                    )}
                    {folder.goal && (
                      <p className="text-xs text-[#4F5BD5] mb-2">🎯 {folder.goal}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>📄 {folder.fileCount ?? 0} {(folder.fileCount ?? 0) === 1 ? 'file' : 'files'}</span>
                    </div>
                  </div>
                ))}

                {/* New projectCard */}
                <div
                  onClick={() => { setNewFolderName(""); setFolderDialogOpen(true) }}
                  className="rounded-xl border-2 border-dashed p-4 hover:border-[#4F5BD5]/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[#4F5BD5]"
                >
                  <span className="text-2xl">+</span>
                  <span className="text-sm">New project</span>
                </div>
              </div>

              {/* UnfiledSection */}
              {unfiledCount > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">📄 Unfiled ({unfiledCount})</h3>
                  <button onClick={() => router.push("/files")} className="text-sm text-[#4F5BD5] hover:underline">
                    View all files →
                  </button>
                </div>
              )}

              {/* Empty state guide — hidden when user has ≥1 project AND ≥1 file */}
              {(folders.length === 0 || fileCount === 0) && (
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">🚀 开始使用</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setNewFolderName(""); setFolderDialogOpen(true) }}
                      className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-left hover:border-[#4F5BD5]/30 hover:bg-[#4F5BD5]/5 transition-all"
                    >
                      <span className="text-2xl shrink-0">📁</span>
                      <div>
                        <p className="text-sm font-medium">创建你的第一个项目</p>
                        <p className="text-xs text-muted-foreground mt-0.5">按项目组织你的知识库</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { handleTabSwitch("files"); setShowUpload(true) }}
                      className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-left hover:border-[#4F5BD5]/30 hover:bg-[#4F5BD5]/5 transition-all"
                    >
                      <span className="text-2xl shrink-0">📄</span>
                      <div>
                        <p className="text-sm font-medium">上传第一份文件</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF, 文档, 笔记——AI 自动索引一切</p>
                      </div>
                    </button>
                    <button
                      onClick={() => router.push("/chat?new=1")}
                      className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-left hover:border-[#4F5BD5]/30 hover:bg-[#4F5BD5]/5 transition-all"
                    >
                      <span className="text-2xl shrink-0">💬</span>
                      <div>
                        <p className="text-sm font-medium">试试 AI 对话</p>
                        <p className="text-xs text-muted-foreground mt-0.5">提问即可获得带引用的精准回答</p>
                      </div>
                    </button>
                    <button
                      onClick={() => router.push("/developers")}
                      className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-left hover:border-[#4F5BD5]/30 hover:bg-[#4F5BD5]/5 transition-all"
                    >
                      <span className="text-2xl shrink-0">🔌</span>
                      <div>
                        <p className="text-sm font-medium">用 CLI / MCP 连接</p>
                        <p className="text-xs text-muted-foreground mt-0.5">让你的 AI 助手访问知识库</p>
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

          {/* New project chat box */}
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
            <div className="px-4 py-5 space-y-4">
              {/* Hero section */}
              <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
                  <Sparkles className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1.5">Upload files to start your AI knowledge base</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  After uploading, AI will understand your content, build knowledge memory, and provide insights and cross-file analysis.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { handleTabSwitch("files"); setShowUpload(true) }}
                    className="rounded-lg bg-[#4F5BD5] px-5 py-2.5 text-sm text-white hover:bg-[#3D49C4] transition inline-flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload your first file
                  </button>
                  <button
                    onClick={() => router.push("/chat?new=1")}
                    className="rounded-lg border border-[#4F5BD5]/30 px-5 py-2.5 text-sm text-[#4F5BD5] hover:bg-[#4F5BD5]/5 transition inline-flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Start a conversation
                  </button>
                </div>
              </div>

              {/* AI capabilities grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🔍", title: "Semantic search", desc: "Search with natural language, AI understands intent not just keywords", color: "border-blue-500/20" },
                  { icon: "💬", title: "AI Q&A", desc: "Ask questions, get cited answers from your files", color: "border-green-500/20" },
                  { icon: "💡", title: "Smart insights", desc: "Auto-discover connections, contradictions, and trends", color: "border-amber-500/20" },
                  { icon: "📊", title: "Analysis reports", desc: "Generate cross-file analysis, study notes, and comparisons", color: "border-purple-500/20" },
                ].map((item) => (
                  <div key={item.title} className={cn("rounded-lg border p-3", item.color)}>
                    <div className="text-lg mb-1">{item.icon}</div>
                    <h4 className="text-sm font-medium mb-0.5">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Example questions */}
              <div className="rounded-xl border border-border/60 p-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">💬 Try these questions</h4>
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
                      className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-left text-sm hover:bg-muted/60 transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{q}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick entries */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => { handleTabSwitch("files"); setShowUpload(true) }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed p-3 hover:bg-muted/50 transition"
                >
                  <Upload className="h-5 w-5 text-[#4F5BD5]" />
                  <span className="text-xs font-medium">Upload files</span>
                </button>
                <Link
                  href="/chat"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed p-3 hover:bg-muted/50 transition"
                >
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  <span className="text-xs font-medium">AI Chat</span>
                </Link>
                <Link
                  href="/developers"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed p-3 hover:bg-muted/50 transition"
                >
                  <FolderOpen className="h-5 w-5 text-purple-500" />
                  <span className="text-xs font-medium">API Docs</span>
                </Link>
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-dashed border-border/60 p-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">How it works</h4>
                <div className="flex items-start gap-4">
                  {[
                    { step: "1", label: "Upload files", sub: "PDF, docs, notes, etc." },
                    { step: "2", label: "AI auto-indexes", sub: "Understands content and builds memory" },
                    { step: "3", label: "Get insights", sub: "Analysis, reports, Q&A" },
                  ].map((s, i) => (
                    <div key={s.step} className="flex-1 flex flex-col items-center text-center">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4F5BD5]/10 text-xs font-semibold text-[#4F5BD5] mb-1.5">
                        {s.step}
                      </div>
                      <span className="text-xs font-medium">{s.label}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <QuickActions onGenerate={handleQuickGenerate} onOrganize={handleAutoOrganize} />
              <MemoryOverview />

              {/* AI ReportSection */}
              <div className="mx-4 mb-4 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold">📊 AI Reports</h3>
                </div>
                <ReportSection ref={reportRef} />
              </div>

              {/* Divider */}
              <div className="mx-4 mb-4">
                <div className="border-t border-border/60" />
              </div>

              {/* AI InsightsSection */}
              <div className="mx-4 mb-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10">
                    <Lightbulb className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold">💡 AI Insights</h3>
                  {insights.filter(i => !i.read).length > 0 && (
                    <span className="rounded-full bg-[#4F5BD5] px-1.5 py-0.5 text-[10px] text-white">
                      {insights.filter(i => !i.read).length}  new
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
                  <p className="text-xs text-muted-foreground">AI will show insights when it discovers connections between files</p>
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
