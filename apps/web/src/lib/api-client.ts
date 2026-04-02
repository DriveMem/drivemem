const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'

interface ApiError {
  status: number
  message: string
  code?: string
}

export class ApiClientError extends Error {
  status: number
  code?: string
  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiClientError'
    this.status = error.status
    this.code = error.code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers, credentials: 'include' })

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    let errorData: ApiError
    try { errorData = await res.json() } catch { errorData = { status: res.status, message: res.statusText } }
    throw new ApiClientError(errorData)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function createSSEStream(path: string, options?: {
  method?: string
  body?: string
  onMessage: (data: string) => void
  onError?: (error: Error) => void
  onDone?: () => void
}): AbortController {
  const controller = new AbortController()
  const url = `${API_BASE}${path}`
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options?.body) headers['Content-Type'] = 'application/json'

  fetch(url, {
    method: options?.method || 'GET',
    body: options?.body,
    signal: controller.signal,
    headers,
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok || !res.body) { options?.onError?.(new Error(`SSE failed: ${res.status}`)); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) { options?.onDone?.(); break }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') options?.onDone?.()
          else options?.onMessage(data)
        }
      }
    }
  }).catch((err) => { if (err.name !== 'AbortError') options?.onError?.(err) })

  return controller
}

export type { ApiError }
