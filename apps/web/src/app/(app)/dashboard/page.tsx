"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FolderOpen, Sparkles, Upload, X, Lightbulb, AlertTriangle, TrendingUp } from "lucide-react"
import { FileList } from "@/components/file/file-list"
import { MemoryOverview } from "@/components/dashboard/memory-overview"
import { KnowledgeLinks } from "@/components/dashboard/knowledge-links"
import { AiInsights } from "@/components/dashboard/ai-insights"
import { InsightCard } from "@/components/dashboard/insight-card"
import { ReportSection, type ReportSectionHandle } from "@/components/dashboard/report-section"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { useFiles } from "@/hooks/use-files"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

// --- helpers ---
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
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
    { icon: "💬", label: "新 AI 对话", action: () => router.push("/chat?new=1") },
    { icon: "📊", label: "生成分析报告", action: () => onGenerate("analysis") },
    { icon: "📝", label: "生成学习笔记", action: () => onGenerate("study") },
    { icon: "🔍", label: "AI 整理文件", action: onOrganize },
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
        AI 会在发现知识关联时自动通知你
      </div>
    )
  }

  return (
    <div className="mx-3 mb-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">最近活动</h4>
      <div className="text-xs text-muted-foreground mb-2">
        今日索引 {fileCount} 文件 · {insightCount} 条洞察 · {linkCount} 个关联
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
        <button className="mt-2 text-xs text-[#4F5BD5] hover:underline">查看全部</button>
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
  const label = unread > 0 ? `${count} 条新知识关联` : `${count} 条知识关联`
  const previews = insights.slice(0, 3)

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("insights-card-dismissed", "true")
  }

  return (
    <div className="mx-6 mb-3 rounded-xl border border-[#4F5BD5]/20 bg-[#4F5BD5]/5 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={onSwitchToAi} className="text-sm font-medium hover:underline">
          💡 AI 发现了 {label}
          <span className="ml-1.5 text-xs text-[#4F5BD5]">查看 →</span>
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

// --- Section header helper ---
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="mx-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{children}</h4>
}

export default function DashboardPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<"files" | "ai">("files")
  const { data: filesData } = useFiles()
  const [activities, setActivities] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const reportRef = useRef<ReportSectionHandle>(null)

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

  useEffect(() => {
    document.title = "我的文件 - AI Drive"
  }, [])

  const handleQuickGenerate = (type: "analysis" | "study") => {
    reportRef.current?.generate(type)
  }

  const handleAutoOrganize = async () => {
    try {
      await apiFetch("/api/files/auto-organize", { method: "POST" })
      toast.success("文件整理已开始")
    } catch {
      toast.error("文件整理失败")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WelcomeModal onUpload={() => setShowUpload(true)} />

      {/* Tab switcher */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab("files")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition",
              activeTab === "files"
                ? "border-blue-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            最近文件
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition",
              activeTab === "ai"
                ? "border-blue-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI 助手
            {fileCount > 3 && activeTab !== "ai" && (
              <span className="absolute top-1.5 right-1 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "files" ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <InsightsSummaryCard insights={insights} onSwitchToAi={() => setActiveTab("ai")} />
          <div className="flex-1 min-h-0">
            <FileList />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-1 animate-in fade-in duration-200">
          {fileCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-indigo-500/10 p-4 mb-4">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">上传文件，开启 AI 知识库</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                上传文件后，AI 将自动理解内容、建立知识记忆，并为你提供智能洞察和跨文件关联分析。
              </p>
              <button
                onClick={() => { setActiveTab("files"); setShowUpload(true) }}
                className="mt-6 rounded-lg bg-[#4F5BD5] px-6 py-2.5 text-sm text-white hover:bg-[#3D49C4] transition"
              >
                上传第一个文件
              </button>
            </div>
          ) : fileCount <= 3 ? (
            <div>
              <QuickActions onGenerate={handleQuickGenerate} onOrganize={handleAutoOrganize} />
              <MemoryOverview />
              {insights.length > 0 && (
                <div className="mx-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      💡 AI 主动洞察
                      {insights.filter(i => !i.read).length > 0 && (
                        <span className="rounded-full bg-[#4F5BD5] px-1.5 py-0.5 text-[10px] text-white">
                          {insights.filter(i => !i.read).length} 条新
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {insights.map(insight => (
                      <InsightCard key={insight.id} insight={insight} onRead={() => {
                        setInsights(prev => prev.map(i => i.id === insight.id ? { ...i, read: true } : i))
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <SectionLabel>AI 报告</SectionLabel>
              <ReportSection ref={reportRef} />
              <ActivitySummary activities={activities} />
            </div>
          ) : (
            <>
              <QuickActions onGenerate={handleQuickGenerate} onOrganize={handleAutoOrganize} />
              <MemoryOverview />
              {insights.length > 0 && (
                <div className="mx-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      💡 AI 主动洞察
                      {insights.filter(i => !i.read).length > 0 && (
                        <span className="rounded-full bg-[#4F5BD5] px-1.5 py-0.5 text-[10px] text-white">
                          {insights.filter(i => !i.read).length} 条新
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {insights.map(insight => (
                      <InsightCard key={insight.id} insight={insight} onRead={() => {
                        setInsights(prev => prev.map(i => i.id === insight.id ? { ...i, read: true } : i))
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <AiInsights />
              <KnowledgeLinks />
              <SectionLabel>AI 报告</SectionLabel>
              <ReportSection ref={reportRef} />
              <ActivitySummary activities={activities} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
