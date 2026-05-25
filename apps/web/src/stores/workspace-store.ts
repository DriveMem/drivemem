import { create } from 'zustand'

export interface Workspace {
  id: string
  name: string
  slug: string
  type: 'personal' | 'team'
  memberCount?: number
  role?: string
}

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  loading: boolean
  setCurrentWorkspace: (workspace: Workspace) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  setLoading: (loading: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  workspaces: [],
  loading: false,
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setLoading: (loading) => set({ loading }),
}))
