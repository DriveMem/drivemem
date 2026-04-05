import { getSession } from "next-auth/react"

const PRODUCTION_API = "https://api.verrrnm.cloud"
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
const API_BASE = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

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
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: { message: res.statusText } }))
    const errMsg = errBody?.error?.message || res.statusText
    if (res.status === 403 && errBody?.error?.code === "DEMO_READONLY") {
      const { toast } = await import("sonner")
      toast.error("Demo 账号为只读模式，注册后可使用完整功能")
    }
    throw new Error(errMsg)
  }

  if (res.status === 204) return null
  return res.json()
}
