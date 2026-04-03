import { create } from 'zustand'
interface LayoutState {
  sidebarCollapsed: boolean; inspectorOpen: boolean; selectedFileId: string | null; currentFolderId: string | null
  mobileMenuOpen: boolean; mobileInspectorOpen: boolean; mobileChatSidebarOpen: boolean
  toggleSidebar: () => void; openInspector: (fileId: string) => void; closeInspector: () => void; setCurrentFolder: (folderId: string | null) => void
  setMobileMenuOpen: (open: boolean) => void; setMobileInspectorOpen: (open: boolean) => void; setMobileChatSidebarOpen: (open: boolean) => void
}
export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false, inspectorOpen: false, selectedFileId: null, currentFolderId: null,
  mobileMenuOpen: false, mobileInspectorOpen: false, mobileChatSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openInspector: (fileId) => set({ inspectorOpen: true, selectedFileId: fileId }),
  closeInspector: () => set({ inspectorOpen: false, selectedFileId: null, mobileInspectorOpen: false }),
  setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setMobileInspectorOpen: (open) => set({ mobileInspectorOpen: open }),
  setMobileChatSidebarOpen: (open) => set({ mobileChatSidebarOpen: open }),
}))
