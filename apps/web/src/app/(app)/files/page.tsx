"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { FileList } from "@/components/file/file-list"
import { FolderTree } from "@/components/file/folder-tree"
import { WorkItemsPanel } from "@/components/dashboard/work-items-panel"
import { useTags } from "@/hooks/use-tags"
import { useLayoutStore } from "@/stores/layout-store"
import { List, Network } from "lucide-react"
import { cn } from "@/lib/utils"
import { KnowledgeSkeleton } from "@/components/ui/skeleton-loader"
import { useFiles } from "@/hooks/use-files"

const GraphEmbed = dynamic(() => import("@/app/(app)/graph/page"), { ssr: false })

export default function KnowledgePage() {
  const [view, setView] = useState<"list" | "graph">("list")
  const { activeTagFilter, setActiveTagFilter, currentFolderId } = useLayoutStore()
  const { data: tags = [], isLoading: tagsLoading } = useTags()
  const { isLoading: filesLoading } = useFiles(currentFolderId)

  useEffect(() => { document.title = "Knowledge — DriveMem" }, [])

  if (filesLoading && tagsLoading) {
    return <KnowledgeSkeleton />
  }

  return (
    <div className="flex h-full page-enter">
      {/* Left panel — Projects + Tags */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border shrink-0 overflow-y-auto">
        <div className="p-3">
          <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium mb-2">Projects</p>
          <FolderTree />
        </div>
        {tags.length > 0 && (
          <div className="border-t border-border p-3">
            <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {activeTagFilter && (
                <button onClick={() => setActiveTagFilter(null)} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80">
                  All ×
                </button>
              )}
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  onClick={() => setActiveTagFilter(activeTagFilter === tag.name ? null : tag.name)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
                    activeTagFilter === tag.name ? "ring-1 ring-offset-1" : "opacity-70 hover:opacity-100"
                  )}
                  style={{ backgroundColor: tag.color + "20", color: tag.color }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Right panel — File List or Graph */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar with view toggle */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h1 className="text-body font-medium">Knowledge</h1>
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn("px-2.5 py-1 text-caption rounded", view === "list" ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
            >
              <List className="h-3.5 w-3.5 inline mr-1" />List
            </button>
            <button
              onClick={() => setView("graph")}
              className={cn("px-2.5 py-1 text-caption rounded", view === "graph" ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
            >
              <Network className="h-3.5 w-3.5 inline mr-1" />Graph
            </button>
          </div>
        </div>

        {/* Content */}
        {view === "list" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Work Items for selected project */}
            {currentFolderId && (
              <div className="px-4 pt-4">
                <WorkItemsPanel folderId={currentFolderId} defaultExpanded />
              </div>
            )}
            <FileList />
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <GraphEmbed />
          </div>
        )}
      </div>
    </div>
  )
}
