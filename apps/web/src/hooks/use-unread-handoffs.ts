"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"

export function useUnreadHandoffs() {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await apiFetch("/handoffs?role=to&status=sent,received", { silent: true })
      const data = await res.json()
      setCount(Array.isArray(data) ? data.length : data?.total ?? 0)
    } catch {
      // silently ignore polling errors
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [fetchCount])

  return count
}
