import { apiFetch } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Tag {
  id: string
  name: string
  color: string
  userId: string
  createdAt: string
}

export const TAG_COLORS = [
  { name: '红色', value: 'red' },
  { name: '蓝色', value: 'blue' },
  { name: '绿色', value: 'green' },
  { name: '黄色', value: 'yellow' },
  { name: '紫色', value: 'purple' },
]

export const TAG_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
}

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => apiFetch('/api/tags'),
  })
}

export function useFileTags(fileId: string) {
  return useQuery<Tag[]>({
    queryKey: ['file-tags', fileId],
    queryFn: () => apiFetch(`/api/tags/file/${fileId}`),
    enabled: !!fileId,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      apiFetch('/api/tags', { method: 'POST', body: JSON.stringify({ name, color }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tags/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useAddFileTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, tagId }: { fileId: string; tagId: string }) =>
      apiFetch(`/api/tags/file/${fileId}`, { method: 'POST', body: JSON.stringify({ tagId }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['file-tags', vars.fileId] })
    },
  })
}

export function useRemoveFileTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, tagId }: { fileId: string; tagId: string }) =>
      apiFetch(`/api/tags/file/${fileId}/${tagId}`, { method: 'DELETE' }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['file-tags', vars.fileId] })
    },
  })
}

export function useTagFileIds(tagId: string) {
  return useQuery<string[]>({
    queryKey: ['tag-files', tagId],
    queryFn: () => apiFetch(`/api/tags/${tagId}/files`),
    enabled: !!tagId,
  })
}
