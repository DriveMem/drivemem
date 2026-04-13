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
    mutationFn: async ({ file, folderId, onProgress }: { file: File; folderId?: string | null; onProgress?: (pct: number) => void }) => {
      const session = await (await import("next-auth/react")).getSession()
      const token = (session as any)?.accessToken
      const formData = new FormData()
      formData.append("file", file)
      if (folderId) formData.append("folderId", folderId)

      const PRODUCTION_API = "https://api.drivemem.cloud"
      const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
      const API_BASE = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)) } catch { resolve({}) }
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              reject(new Error(err.error?.message || xhr.statusText))
            } catch { reject(new Error(xhr.statusText)) }
          }
        }
        xhr.onerror = () => reject(new Error("Upload failed"))
        xhr.open("POST", `${API_BASE}/api/files/upload`)
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
        xhr.withCredentials = true
        xhr.send(formData)
      })
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
