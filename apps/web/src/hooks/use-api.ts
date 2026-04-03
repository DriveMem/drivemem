import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

// Types matching backend responses
interface FileItem { id: string; name: string; mimeType: string; size: number; folderId: string | null; parseStatus: string; parseError: string | null; createdAt: string; updatedAt: string }
interface FolderItem { id: string; name: string; parentId: string | null; createdAt: string }
interface UserProfile { id: string; email: string; name: string; avatarUrl: string | null; storageUsed: number; storageLimit: number; dailyChatCount: number; dailyChatLimit: number }
interface Conversation { id: string; title: string | null; scope: string | null; scopeId: string | null; createdAt: string; updatedAt: string }
interface Message { id: string; role: "user" | "assistant"; content: string; citations: { index: number; filename: string; snippet: string }[] | null; createdAt: string }
interface SearchResult { fileId: string; filename: string; snippet: string; score: number }

// === Files ===
export function useFiles(folderId?: string | null) {
  return useQuery({
    queryKey: ["files", folderId],
    queryFn: () => api.get<{ files: FileItem[] }>(folderId ? `/files?folderId=${folderId}` : "/files").then(d => d.files),
  })
}

export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      // 1. Get presigned URL
      const { uploadUrl, fileId } = await api.post<{ uploadUrl: string; fileId: string }>("/files/upload", {
        name: file.name, mimeType: file.type, size: file.size,
      })
      // 2. Upload to S3
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
      // 3. Confirm
      await api.post(`/files/${fileId}/confirm`)
      return fileId
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => api.delete(`/files/${fileId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  })
}

// === Folders ===
export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: () => api.get<{ folders: FolderItem[] }>("/folders").then(d => d.folders),
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; parentId?: string }) => api.post<FolderItem>("/folders", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  })
}

// === User ===
export function useUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: () => api.get<UserProfile>("/users/me"),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => api.patch<UserProfile>("/users/me", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user"] }),
  })
}

// === Conversations ===
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<{ conversations: Conversation[] }>("/conversations").then(d => d.conversations),
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ["conversations", id],
    queryFn: () => api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
    enabled: !!id,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { scope?: string; scopeId?: string }) => api.post<Conversation>("/conversations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  })
}

// === Search ===
export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => api.get<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`).then(d => d.results),
    enabled: query.length > 0,
  })
}

export type { FileItem, FolderItem, UserProfile, Conversation, Message, SearchResult }
