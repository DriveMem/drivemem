import { apiFetch } from '@/lib/api-client'
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
      // Step 1: Get presigned URL
      const { uploadUrl, fileId, s3Key } = await apiFetch('/api/files/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          folderId: folderId || null,
        }),
      })
      // Step 2: Upload to S3
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      // Step 3: Confirm
      return apiFetch('/api/files/confirm', {
        method: 'POST',
        body: JSON.stringify({ fileId }),
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
