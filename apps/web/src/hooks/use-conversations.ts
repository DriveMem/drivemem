import { apiFetch } from '@/lib/api-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'


export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch('/api/conversations'),
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiFetch(`/api/conversations/${id}`),
    enabled: !!id,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scope: { type: 'all' | 'folder' | 'file'; id?: string }) =>
      apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ scope }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}
