import { DriveMemConfig, SearchResult, AskResponse, StoreResponse, CompileResponse, FileInfo } from './types.js'

export class DriveMem {
  private apiKey: string
  private endpoint: string

  constructor(config: DriveMemConfig) {
    this.apiKey = config.apiKey
    this.endpoint = (config.endpoint || 'https://drivemem.cloud').replace(/\/$/, '')
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.endpoint}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
      throw new Error(error.message || error.error || `DriveMem API error: ${response.status}`)
    }
    return response.json()
  }

  /** Search knowledge base semantically */
  async search(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query })
    if (options?.limit) params.set('limit', String(options.limit))
    const data = await this.request(`/api/v1/search?${params}`)
    return data.results || []
  }

  /** Ask a question — get AI answer with citations */
  async ask(question: string): Promise<AskResponse> {
    return this.request('/api/v1/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
  }

  /** Store knowledge */
  async store(content: string, options?: { title?: string; tags?: string }): Promise<StoreResponse> {
    return this.request('/api/v1/store', {
      method: 'POST',
      body: JSON.stringify({ content, title: options?.title, tags: options?.tags }),
    })
  }

  /** Compile context briefing for a task */
  async compile(task: string, options?: { tokenBudget?: number; project?: string; tags?: string[]; recency?: string }): Promise<CompileResponse> {
    return this.request('/api/v1/context/compile', {
      method: 'POST',
      body: JSON.stringify({
        task,
        tokenBudget: options?.tokenBudget || 8000,
        hints: {
          project: options?.project,
          tags: options?.tags,
          recency: options?.recency,
        },
      }),
    })
  }

  /** List files */
  async files(options?: { detail?: 'brief' | 'full' }): Promise<FileInfo[]> {
    const params = options?.detail ? `?detail=${options.detail}` : ''
    const data = await this.request(`/api/v1/files${params}`)
    return data.files || []
  }

  /** Get user identity */
  async identity(): Promise<Record<string, any>> {
    const data = await this.request('/api/v1/identity')
    return data
  }

  /** Verify connection */
  async ping(): Promise<boolean> {
    try {
      await this.search('test', { limit: 1 })
      return true
    } catch {
      return false
    }
  }
}
