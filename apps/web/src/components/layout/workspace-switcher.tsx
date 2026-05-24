"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWorkspaceStore, Workspace } from "@/stores/workspace-store"
import { useLayoutStore } from "@/stores/layout-store"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CreateWorkspaceModal } from "@/components/workspace/create-workspace-modal"

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, setCurrentWorkspace, setWorkspaces, setLoading } = useWorkspaceStore()
  const { sidebarCollapsed } = useLayoutStore()
  const [createOpen, setCreateOpen] = useState(false)

  const fetchWorkspaces = async () => {
    setLoading(true)
    try {
      const data = await apiFetch("/api/v1/workspaces")
      const list: Workspace[] = data?.workspaces ?? data ?? []
      setWorkspaces(list)
      if (!currentWorkspace && list.length > 0) {
        setCurrentWorkspace(list[0])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreated = (ws: Workspace) => {
    setWorkspaces([...workspaces, ws])
    setCurrentWorkspace(ws)
    setCreateOpen(false)
  }

  if (sidebarCollapsed) return null

  return (
    <>
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="truncate">{currentWorkspace?.name ?? "Select Workspace"}</span>
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className={cn(
                  currentWorkspace?.id === ws.id && "bg-brand-50 dark:bg-brand-500/10 font-medium"
                )}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CreateWorkspaceModal open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
    </>
  )
}
