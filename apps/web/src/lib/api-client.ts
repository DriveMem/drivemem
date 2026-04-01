import { getSession } from "next-auth/react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

export async function apiFetch(path: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  }

  // 方案 C: attach Bearer token from session
  try {
    const session = await getSession()
    const token = (session as any)?.accessToken
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  } catch {
    // getSession may fail server-side, ignore
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // 方案 A fallback: send cookies
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(error.error?.message || res.statusText)
  }

  if (res.status === 204) return null
  return res.json()
}
