import { create } from "zustand"

export interface UploadEntry {
  id: string
  name: string
  progress: number
  status: "uploading" | "done" | "error"
  error?: string
}

interface UploadStore {
  entries: UploadEntry[]
  addEntry: (entry: UploadEntry) => void
  updateEntry: (id: string, patch: Partial<UploadEntry>) => void
  removeEntry: (id: string) => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  entries: [],
  addEntry: (entry) => set((s) => ({ entries: [...s.entries, entry] })),
  updateEntry: (id, patch) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  removeEntry: (id) =>
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
}))
