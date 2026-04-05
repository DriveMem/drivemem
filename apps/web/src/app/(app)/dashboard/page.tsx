"use client"

import { useState, useEffect } from "react"
import { Search, FolderOpen, Sparkles } from "lucide-react"
import { FileList } from "@/components/file/file-list"
import { MemoryOverview } from "@/components/dashboard/memory-overview"
import { KnowledgeLinks } from "@/components/dashboard/knowledge-links"
import { AiInsights } from "@/components/dashboard/ai-insights"
import { ReportSection } from "@/components/dashboard/report-section"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<"files" | "ai">("files")

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
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition",
              activeTab === "ai"
                ? "border-blue-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI 助手
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
          <MemoryOverview />
          <AiInsights />
          <KnowledgeLinks />
          <ReportSection />
        </div>
      )}
    </div>
  )
}
