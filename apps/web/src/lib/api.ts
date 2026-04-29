import { getSession } from "next-auth/react"

const PRODUCTION_API = "https://api.drivemem.cloud"
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
const API_BASE = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

/** API error with status field for downstream classifyError */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** Dedupe: only show one network error toast within a short window */
let lastNetworkToastAt = 0

async function showNetworkToast(msg: string) {
  const now = Date.now()
  if (now - lastNetworkToastAt < 3000) return // no repeat within 3s
  lastNetworkToastAt = now
  if (typeof window === "undefined") return
  const { showErrorToast } = await import("@/components/ui/error-toast")
  showErrorToast(msg)
}

export interface ApiFetchOptions extends RequestInit {
  /** Suppress error toasts (useful for non-critical background requests) */
  silent?: boolean
}

export async function apiFetch(path: string, options?: ApiFetchOptions) {
  const { silent, ...fetchOptions } = options || {}
  const method = (fetchOptions.method || "GET").toUpperCase()
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }

  // Only set Content-Type for requests with a body (Fastify 5 rejects empty JSON body)
  if (fetchOptions.body || method === "GET" || method === "HEAD") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json"
  }

  try {
    const session = await getSession() as { accessToken?: string } | null
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
    }
  } catch {}

  const url = `${API_BASE}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: "include",
    })
  } catch (err) {
    // Network error (Failed to fetch / TypeError) or timeout (AbortError)
    const isTimeout = err instanceof DOMException && err.name === "AbortError"
    if (isTimeout) {
      if (!silent) showNetworkToast("Request timeout — please check your network")
      throw new ApiError("Request timeout", 0)
    }
    if (!silent) showNetworkToast("Network error — please check your connection")
    throw err
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: { message: res.statusText } }))
    const errMsg = errBody?.error?.message || res.statusText

    if (res.status === 403 && errBody?.error?.code === "DEMO_READONLY") {
      const { showErrorToast } = await import("@/components/ui/error-toast")
      showErrorToast("Demo account is read-only. Sign up for full access.", { level: "warning" })
    }

    // 5xx server error → toast (unless silent)
    if (res.status >= 500 && !silent) {
      showNetworkToast("Service temporarily unavailable")
    }

    throw new ApiError(errMsg, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}
