import { apiFetch } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Tag {
  id: string
  name: string
  color: string
  userId: string
}

// List all user tags
export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => apiFetch('/api/tags'),
  })
}

// Get tags for a specific file
export function useFileTags(fileId: string | null) {
  return useQuery<Tag[]>({
    queryKey: ['file-tags', fileId],
    queryFn: () => apiFetch(`/api/tags/file/${fileId}`),
    enabled: !!fileId,
  })
}

// Create a new tag
export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      apiFetch('/api/tags', { method: 'POST', body: JSON.stringify({ name, color }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

// Add tag to file
export function useAddTagToFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, tagId }: { fileId: string; tagId: string }) =>
      apiFetch(`/api/tags/file/${fileId}`, { method: 'POST', body: JSON.stringify({ tagId }) }),
    onSuccess: (_data, { fileId }) => {
      qc.invalidateQueries({ queryKey: ['file-tags', fileId] })
      qc.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

// Remove tag from file
export function useRemoveTagFromFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, tagId }: { fileId: string; tagId: string }) =>
      apiFetch(`/api/tags/file/${fileId}/${tagId}`, { method: 'DELETE' }),
    onSuccess: (_data, { fileId }) => {
      qc.invalidateQueries({ queryKey: ['file-tags', fileId] })
      qc.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

// Delete a tag entirely
export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tagId: string) =>
      apiFetch(`/api/tags/${tagId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['files'] })
    },
  })
}
