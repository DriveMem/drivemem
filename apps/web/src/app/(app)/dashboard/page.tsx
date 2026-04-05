"use client"

import { useState } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FolderPlus, MessageSquare, Sparkles } from "lucide-react"
import { FileList } from "@/components/file/file-list"
import { AiHub } from "@/components/dashboard/ai-hub"
import { KnowledgeLinks } from "@/components/dashboard/knowledge-links"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { useFiles } from "@/hooks/use-files"
import { FileUpload } from "@/components/file/file-upload"
import { useCreateFolder } from "@/hooks/use-folders"
import { useLayoutStore } from "@/stores/layout-store"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"

function QuickActions({ onUpload }: { onUpload: () => void }) {
  const router = useRouter()
  const createFolder = useCreateFolder()
  const { currentFolderId } = useLayoutStore()
  const queryClient = useQueryClient()

  const actions = [
    {
      icon: Upload,
      emoji: "📤",
      label: "上传文件",
      onClick: onUpload,
    },
    {
      icon: FolderPlus,
      emoji: "📁",
      label: "新建文件夹",
      onClick: () => {
        const name = prompt("文件夹名称", "新建文件夹")
        if (name?.trim()) {
          createFolder.mutate({ name: name.trim(), parentId: currentFolderId }, {
            onSuccess: () => toast.success(`文件夹「${name.trim()}」已创建`),
            onError: (err: any) => toast.error(err?.message || "创建失败"),
          })
        }
      },
    },
    {
      icon: MessageSquare,
      emoji: "💬",
      label: "开始对话",
      onClick: () => router.push("/chat"),
    },
    {
      icon: Sparkles,
      emoji: "🤖",
      label: "AI 整理",
      onClick: async () => {
        toast.info("AI 正在整理文件...")
        try {
          const data = await apiFetch("/api/files/auto-organize", { method: "POST" })
          toast.success(data?.message || "整理完成")
          queryClient.invalidateQueries({ queryKey: ["files"] })
          queryClient.invalidateQueries({ queryKey: ["folders"] })
        } catch (e: any) {
          toast.error(e.message || "整理失败")
        }
      },
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm active:scale-[0.98]"
        >
          <span className="text-xl">{action.emoji}</span>
          <span className="text-sm font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function FilesPage() {
  const [showUpload, setShowUpload] = useState(false)
  const { isLoading } = useFiles()

  useEffect(() => {
    document.title = "我的文件 - AI Drive"
  }, [])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      <WelcomeModal onUpload={() => setShowUpload(true)} />
      <AiHub />
      <QuickActions onUpload={() => setShowUpload(true)} />
      {showUpload && <div className="px-4"><FileUpload onClose={() => setShowUpload(false)} /></div>}
      <KnowledgeLinks />
      <div className="flex-1 min-h-0">
        <FileList />
      </div>
    </div>
  )
}
