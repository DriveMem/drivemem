import { apiFetch } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface RecentConversation {
  id: string
  title: string
  lastMessageAt: string
  messageCount: number
  previewSnippet: string
  isPinned: boolean
}

export function useRecentConversations(limit = 10) {
  return useQuery<{ conversations: RecentConversation[] }>({
    queryKey: ['conversations', 'recent', limit],
    queryFn: () => apiFetch(`/api/conversations/recent?limit=${limit}`, { silent: true }),
    retry: 2,
    retryDelay: 1000,
  })
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch('/api/conversations', { silent: true }),
    retry: 2,
    retryDelay: 1000,
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiFetch(`/api/conversations/${id}`, { silent: true }),
    enabled: !!id && id !== 'new',
    retry: 2,
    retryDelay: 1000,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scopeType, scopeId }: { scopeType: 'all' | 'folder' | 'file'; scopeId?: string }) =>
      apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ scopeType, scopeId }) }),
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
