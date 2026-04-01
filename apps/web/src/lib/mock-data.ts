export interface MockFolder {
  id: string
  name: string
  parentId: string | null
  children?: MockFolder[]
}

export interface MockFile {
  id: string
  name: string
  type: 'pdf' | 'txt' | 'md' | 'image'
  size: number
  folderId: string | null
  createdAt: string
  updatedAt: string
  parseStatus: 'parsing' | 'done' | 'error'
  parseError?: string
}

export const mockFolders: MockFolder[] = [
  { id: 'f1', name: '工作文档', parentId: null, children: [
    { id: 'f1-1', name: '项目资料', parentId: 'f1' },
    { id: 'f1-2', name: '会议记录', parentId: 'f1' },
  ]},
  { id: 'f2', name: '学习笔记', parentId: null, children: [
    { id: 'f2-1', name: 'AI 相关', parentId: 'f2' },
  ]},
  { id: 'f3', name: '个人', parentId: null },
]

export const mockFiles: MockFile[] = [
  { id: '1', name: '产品需求文档 v2.pdf', type: 'pdf', size: 2048000, folderId: 'f1-1', createdAt: '2026-03-28T10:00:00Z', updatedAt: '2026-03-28T10:05:00Z', parseStatus: 'done' },
  { id: '2', name: '技术方案.md', type: 'md', size: 15360, folderId: 'f1-1', createdAt: '2026-03-29T14:00:00Z', updatedAt: '2026-03-29T14:02:00Z', parseStatus: 'done' },
  { id: '3', name: '周报 2026-W13.txt', type: 'txt', size: 4096, folderId: 'f1-2', createdAt: '2026-03-30T09:00:00Z', updatedAt: '2026-03-30T09:01:00Z', parseStatus: 'done' },
  { id: '4', name: 'LLM 论文笔记.md', type: 'md', size: 28672, folderId: 'f2-1', createdAt: '2026-03-25T16:00:00Z', updatedAt: '2026-03-25T16:10:00Z', parseStatus: 'done' },
  { id: '5', name: 'RAG 实践总结.pdf', type: 'pdf', size: 5120000, folderId: 'f2-1', createdAt: '2026-03-26T11:00:00Z', updatedAt: '2026-03-26T11:00:00Z', parseStatus: 'parsing' },
  { id: '6', name: '个人计划.txt', type: 'txt', size: 2048, folderId: 'f3', createdAt: '2026-03-20T08:00:00Z', updatedAt: '2026-03-20T08:00:00Z', parseStatus: 'done' },
  { id: '7', name: '损坏的文件.pdf', type: 'pdf', size: 1024, folderId: null, createdAt: '2026-03-15T12:00:00Z', updatedAt: '2026-03-15T12:01:00Z', parseStatus: 'error', parseError: '文件格式无法解析' },
  { id: '8', name: '未分类笔记.md', type: 'md', size: 8192, folderId: null, createdAt: '2026-03-31T20:00:00Z', updatedAt: '2026-03-31T20:00:00Z', parseStatus: 'done' },
]
