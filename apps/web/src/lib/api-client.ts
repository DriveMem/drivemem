import { getSession } from "next-auth/react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export async function apiFetch(path: string, options?: RequestInit) {
  const session = await getSession()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  // NextAuth JWT session token for API authentication
  // The backend validates this JWT
  if (session) {
    // Get the raw JWT token from the NextAuth cookie
    // For Credentials provider, we need to pass the session info
    // Backend expects: Authorization: Bearer <jwt>
    // Since NextAuth manages JWT internally, we use a session-based approach
    headers['X-User-Id'] = (session.user as any)?.id || ''
    headers['X-User-Email'] = session.user?.email || ''
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for cross-origin requests
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(error.error?.message || res.statusText)
  }

  // Handle 204 No Content
  if (res.status === 204) return null
  
  return res.json()
}
