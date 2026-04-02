import { apiFetch } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'


export function useFiles(folderId?: string | null) {
  return useQuery({
    queryKey: ['files', folderId],
    queryFn: () => apiFetch(`/api/files${folderId ? `?folderId=${folderId}` : ''}`),
  })
}

export function useFile(fileId: string) {
  return useQuery({
    queryKey: ['file', fileId],
    queryFn: () => apiFetch(`/api/files/${fileId}`),
    enabled: !!fileId,
  })
}

export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId?: string | null }) => {
      // Direct upload via backend proxy (no presigned URL)
      const session = await (await import("next-auth/react")).getSession()
      const token = (session as any)?.accessToken
      const formData = new FormData()
      formData.append("file", file)
      if (folderId) formData.append("folderId", folderId)
      
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""
      const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
        throw new Error(error.error?.message || res.statusText)
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => apiFetch(`/api/files/${fileId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}

export function useRenameFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, name }: { fileId: string; name: string }) =>
      apiFetch(`/api/files/${fileId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}

export function useMoveFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: string; folderId: string | null }) =>
      apiFetch(`/api/files/${fileId}/move`, { method: 'POST', body: JSON.stringify({ folderId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}
