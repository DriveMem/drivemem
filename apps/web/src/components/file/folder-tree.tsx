"use client"
import { useState } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLayoutStore } from "@/stores/layout-store"
import { useFolders, type FolderItem } from "@/hooks/use-api"

// Build tree from flat list
function buildTree(folders: FolderItem[]): (FolderItem & { children: FolderItem[] })[] {
  const map = new Map<string, FolderItem & { children: FolderItem[] }>()
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }))
  const roots: (FolderItem & { children: FolderItem[] })[] = []
  folders.forEach((f) => {
    const node = map.get(f.id)!
    if (f.parentId && map.has(f.parentId)) map.get(f.parentId)!.children.push(node)
    else roots.push(node)
  })
  return roots
}

function FolderNode({ folder, depth = 0 }: { folder: FolderItem & { children: FolderItem[] }; depth?: number }) {
  const [expanded, setExpanded] = useState(false)
  const { currentFolderId, setCurrentFolder } = useLayoutStore()
  const isActive = currentFolderId === folder.id
  const hasChildren = folder.children.length > 0
  return (
    <div>
      <button onClick={() => { setCurrentFolder(folder.id); if (hasChildren) setExpanded(!expanded) }}
        className={cn("flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent", isActive && "bg-accent text-accent-foreground")}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        {hasChildren ? (expanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />) : <span className="w-3.5" />}
        {expanded ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded && hasChildren && (folder.children as (FolderItem & { children: FolderItem[] })[]).map((child) => <FolderNode key={child.id} folder={child} depth={depth + 1} />)}
    </div>
  )
}

export function FolderTree() {
  const { currentFolderId, setCurrentFolder } = useLayoutStore()
  const { data: folders, isLoading } = useFolders()
  const tree = folders ? buildTree(folders) : []

  if (isLoading) return <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-0.5">
      <button onClick={() => setCurrentFolder(null)} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent", currentFolderId === null && "bg-accent text-accent-foreground")}><Folder className="h-4 w-4 text-muted-foreground" /><span>全部文件</span></button>
      {tree.map((f) => <FolderNode key={f.id} folder={f} />)}
    </div>
  )
}
