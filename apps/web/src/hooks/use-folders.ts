import { apiFetch } from '@/lib/api-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'


// Build tree from flat list
function buildFolderTree(folders: any[]) {
  const map = new Map()
  const roots: any[] = []
  folders.forEach(f => map.set(f.id, { ...f, children: [] }))
  folders.forEach(f => {
    const node = map.get(f.id)
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const data = await apiFetch('/api/folders')
      return { folders: data.folders, tree: buildFolderTree(data.folders) }
    },
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string | null }) =>
      apiFetch('/api/folders', { method: 'POST', body: JSON.stringify({ name, parentId: parentId || null }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useRenameFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      apiFetch(`/api/folders/${folderId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (folderId: string) => apiFetch(`/api/folders/${folderId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}
