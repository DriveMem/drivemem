export interface DriveMemConfig {
  apiKey: string
  endpoint?: string  // default: https://drivemem.cloud
}

export interface SearchResult {
  fileName: string
  fileId: string
  score: number
  text: string
}

export interface AskResponse {
  answer: string
  sources: Array<{ fileId: string; fileName: string; text: string }>
}

export interface StoreResponse {
  fileId: string
  title: string
}

export interface CompileResponse {
  compiledContext: string
  metadata: {
    fragmentCount: number
    totalTokens: number
    tokenBudget: number
    compilationTimeMs: number
    coverage: 'full' | 'partial' | 'insufficient'
    sources: Array<{ fileId: string; fileName: string; relevanceScore: number; tokensUsed: number }>
  }
}

export interface FileInfo {
  id: string
  name: string
  mimeType: string
  size: number
  status: string
  summary?: string
  createdAt: string
}
