"use client"

import { useState } from "react"
import { useEffect } from "react"
import { FileList } from "@/components/file/file-list"
import { AiHub } from "@/components/dashboard/ai-hub"
import { KnowledgeLinks } from "@/components/dashboard/knowledge-links"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { useFiles } from "@/hooks/use-files"

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
      <KnowledgeLinks />
      <div className="flex-1 min-h-0">
        <FileList />
      </div>
    </div>
  )
}
