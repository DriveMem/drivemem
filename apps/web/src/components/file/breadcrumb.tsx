"use client"
import { ChevronRight, Folder } from "lucide-react"
import { useLayoutStore } from "@/stores/layout-store"
import { useFolders, type FolderItem } from "@/hooks/use-api"

function buildPath(folders: FolderItem[], folderId: string | null): FolderItem[] {
  if (!folderId) return []
  const map = new Map(folders.map((f) => [f.id, f]))
  const path: FolderItem[] = []
  let current = folderId
  while (current) {
    const folder = map.get(current)
    if (!folder) break
    path.unshift(folder)
    current = folder.parentId!
  }
  return path
}

export function Breadcrumb() {
  const { currentFolderId, setCurrentFolder } = useLayoutStore()
  const { data: folders } = useFolders()
  const path = folders ? buildPath(folders, currentFolderId) : []

  return (
    <div className="flex items-center gap-1 px-4 py-2 text-sm border-b border-border">
      <button onClick={() => setCurrentFolder(null)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Folder className="h-3.5 w-3.5" /><span>全部文件</span>
      </button>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <button onClick={() => setCurrentFolder(folder.id)} className="text-muted-foreground hover:text-foreground transition-colors">{folder.name}</button>
        </span>
      ))}
    </div>
  )
}
