"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLayoutStore } from "@/stores/layout-store"
import { useFolders } from "@/hooks/use-folders"

interface FolderItem {
  id: string
  name: string
  parentId: string | null
  children?: FolderItem[]
}

function FolderNode({ folder, depth = 0 }: { folder: FolderItem; depth?: number }) {
  const [expanded, setExpanded] = useState(false)
  const { currentFolderId, setCurrentFolder } = useLayoutStore()
  const isActive = currentFolderId === folder.id
  const hasChildren = folder.children && folder.children.length > 0
  return (
    <div>
      <button
        onClick={() => { setCurrentFolder(folder.id); if (hasChildren) setExpanded(!expanded) }}
        className={cn("flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent", isActive && "bg-accent text-accent-foreground")}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (expanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />) : <span className="w-3.5" />}
        {expanded ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
        <span className="truncate" title={folder.name}>{folder.name}</span>
      </button>
      {expanded && hasChildren && folder.children!.map((child) => <FolderNode key={child.id} folder={child} depth={depth + 1} />)}
    </div>
  )
}

export function FolderTree() {
  const { currentFolderId, setCurrentFolder } = useLayoutStore()
  const { data, isLoading, error } = useFolders()

  const folders: FolderItem[] = data?.tree || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-1 px-2 py-2 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /><span>Failed to load</span>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <button onClick={() => setCurrentFolder(null)} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent", currentFolderId === null && "bg-accent text-accent-foreground")}>
        <Folder className="h-4 w-4 text-muted-foreground" /><span>AllFiles</span>
      </button>
      {folders.map((f) => <FolderNode key={f.id} folder={f} />)}
    </div>
  )
}
