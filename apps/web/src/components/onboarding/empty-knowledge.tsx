"use client"

import { FolderOpen } from "lucide-react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

interface EmptyKnowledgeProps {
  onUpload?: () => void
}

export function EmptyKnowledge({ onUpload }: EmptyKnowledgeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <FolderOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Your knowledge base lives here</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Upload files and your AI tools can search and cite this content.
      </p>
      <p className="text-xs text-muted-foreground">
        Supports: PDF, Markdown, TXT, code files, and 50+ more
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => {
            trackEvent("onboarding.empty_state_click", { action: "knowledge_upload" })
            onUpload?.()
          }}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          Upload Files
        </button>
        <Link
          href="/docs"
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent/50 transition-colors"
        >
          Learn More
        </Link>
      </div>
    </div>
  )
}
