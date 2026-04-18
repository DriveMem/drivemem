import { getSession } from "next-auth/react"

const PRODUCTION_API = "https://api.drivemem.cloud"
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
const API_BASE = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

/** 带 status 字段的 API 错误，方便下游 classifyError 识别 */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** 去重：同一条网络错误 toast 短时间内只弹一次 */
let lastNetworkToastAt = 0

async function showNetworkToast(msg: string) {
  const now = Date.now()
  if (now - lastNetworkToastAt < 3000) return // 3 秒内不重复弹
  lastNetworkToastAt = now
  if (typeof window === "undefined") return
  const { toast } = await import("sonner")
  toast.error(msg)
}

export async function apiFetch(path: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
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
      ...options,
      headers,
      credentials: "include",
    })
  } catch (err) {
    // 网络错误（Failed to fetch / TypeError）或超时（AbortError）
    const isTimeout = err instanceof DOMException && err.name === "AbortError"
    if (isTimeout) {
      showNetworkToast("Request timeout — please check your network")
      throw new ApiError("Request timeout", 0)
    }
    showNetworkToast("Network error — please check your connection")
    throw err
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: { message: res.statusText } }))
    const errMsg = errBody?.error?.message || res.statusText

    if (res.status === 403 && errBody?.error?.code === "DEMO_READONLY") {
      const { toast } = await import("sonner")
      toast.error("Demo account is read-only. Sign up for full access.")
    }

    // 5xx 服务端错误 → toast
    if (res.status >= 500) {
      showNetworkToast("Service temporarily unavailable")
    }

    throw new ApiError(errMsg, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}
