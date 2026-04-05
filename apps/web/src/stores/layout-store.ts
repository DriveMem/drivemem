import { create } from 'zustand'

const SIDEBAR_KEY = 'ai-drive-sidebar-collapsed'

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

interface LayoutState {
  sidebarCollapsed: boolean
  inspectorOpen: boolean
  selectedFileId: string | null
  currentFolderId: string | null
  toggleSidebar: () => void
  openInspector: (fileId: string) => void
  closeInspector: () => void
  setCurrentFolder: (folderId: string | null) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: getInitialCollapsed(),
  inspectorOpen: false,
  selectedFileId: null,
  currentFolderId: null,
  toggleSidebar: () => set((s) => {
    const next = !s.sidebarCollapsed
    try { localStorage.setItem(SIDEBAR_KEY, String(next)) } catch {}
    return { sidebarCollapsed: next }
  }),
  openInspector: (fileId) => set({ inspectorOpen: true, selectedFileId: fileId }),
  closeInspector: () => set({ inspectorOpen: false, selectedFileId: null }),
  setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
}))
