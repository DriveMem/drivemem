"use client"
import { useState } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLayoutStore } from "@/stores/layout-store"
import { mockFolders, type MockFolder } from "@/lib/mock-data"
function FolderNode({ folder, depth = 0 }: { folder: MockFolder; depth?: number }) {
  const [expanded, setExpanded] = useState(false)
  const { currentFolderId, setCurrentFolder } = useLayoutStore()
  const isActive = currentFolderId === folder.id
  const hasChildren = folder.children && folder.children.length > 0
  return (
    <div>
      <button onClick={() => { setCurrentFolder(folder.id); if (hasChildren) setExpanded(!expanded) }}
        className={cn("flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent", isActive && "bg-accent text-accent-foreground")}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        {hasChildren ? (expanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />) : <span className="w-3.5" />}
        {expanded ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded && hasChildren && folder.children!.map((child) => <FolderNode key={child.id} folder={child} depth={depth + 1} />)}
    </div>
  )
}
export function FolderTree() {
  const { currentFolderId, setCurrentFolder } = useLayoutStore()
  return (
    <div className="space-y-0.5">
      <button onClick={() => setCurrentFolder(null)} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent", currentFolderId === null && "bg-accent text-accent-foreground")}><Folder className="h-4 w-4 text-muted-foreground" /><span>全部文件</span></button>
      {mockFolders.map((f) => <FolderNode key={f.id} folder={f} />)}
    </div>
  )
}
