"use client"

import { useState, useEffect } from "react"
import { Search, FolderOpen, Sparkles, Upload } from "lucide-react"
import { FileList } from "@/components/file/file-list"
import { MemoryOverview } from "@/components/dashboard/memory-overview"
import { KnowledgeLinks } from "@/components/dashboard/knowledge-links"
import { AiInsights } from "@/components/dashboard/ai-insights"
import { ReportSection } from "@/components/dashboard/report-section"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { useFiles } from "@/hooks/use-files"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<"files" | "ai">("files")
  const { data: filesData } = useFiles()

  const files = Array.isArray(filesData) ? filesData : (filesData as any)?.files || []
  const fileCount = files.length

  useEffect(() => {
    document.title = "我的文件 - AI Drive"
  }, [])

  // Trigger ⌘K command palette
  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
  }

  return (
    <div className="flex flex-col h-full">
      <WelcomeModal onUpload={() => setShowUpload(true)} />

      {/* Search bar */}
      <div className="px-6 pt-6 pb-4">
        <button
          onClick={openSearch}
          className="w-full max-w-2xl mx-auto flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">搜索文件、对话、知识...</span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 text-xs">⌘K</kbd>
        </button>
      </div>

      {/* Tab switcher */}
      <div className="px-6 pb-2">
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
        <div className="flex-1 min-h-0">
          <FileList />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-2">
          {fileCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-blue-500/10 p-4 mb-4">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">上传文件，开启 AI 知识库</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                上传文件后，AI 将自动理解内容、建立知识记忆，并为你提供智能洞察和跨文件关联分析。
              </p>
              <button
                onClick={() => { setActiveTab("files"); setShowUpload(true) }}
                className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm text-white hover:bg-blue-700 transition"
              >
                上传第一个文件
              </button>
            </div>
          ) : fileCount <= 3 ? (
            <div>
              <MemoryOverview />
              <div className="mx-4 mb-4 rounded-xl border bg-muted/30 p-6 text-center">
                <Sparkles className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  继续上传更多文件，AI 将发现更多跨文件知识关联和深度洞察。
                </p>
              </div>
            </div>
          ) : (
            <>
              <MemoryOverview />
              <AiInsights />
              <KnowledgeLinks />
              <ReportSection />
            </>
          )}
        </div>
      )}
    </div>
  )
}
