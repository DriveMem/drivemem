import { create } from 'zustand'

interface LayoutState {
  sidebarCollapsed: boolean
  inspectorOpen: boolean
  selectedFileId: string | null
  currentFolderId: string | null
  mobileSidebarOpen: boolean
  toggleSidebar: () => void
  openInspector: (fileId: string) => void
  closeInspector: () => void
  setCurrentFolder: (folderId: string | null) => void
  setMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  inspectorOpen: false,
  selectedFileId: null,
  currentFolderId: null,
  mobileSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openInspector: (fileId) => set({ inspectorOpen: true, selectedFileId: fileId }),
  closeInspector: () => set({ inspectorOpen: false, selectedFileId: null }),
  setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
}))
