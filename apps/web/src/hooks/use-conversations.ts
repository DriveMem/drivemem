import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(error.error?.message || res.statusText)
  }
  return res.json()
}

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
