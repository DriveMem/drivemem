"use client"

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"

interface NetworkStatus {
  /** Browser-reported online status */
  isOnline: boolean
  /** API Whether API is reachable (only meaningful when isOnline) */
  isApiReachable: boolean
  /** Last successful connection time */
  lastOnlineAt: number | null
}

// ─── External store (avoid SSR hydration mismatch) ───

let status: NetworkStatus = {
  isOnline: true,
  isApiReachable: true,
  lastOnlineAt: Date.now(),
}
const listeners = new Set<() => void>()
function emit() { listeners.forEach(fn => fn()) }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb) } }
function getSnapshot() { return status }
function getServerSnapshot(): NetworkStatus { return { isOnline: true, isApiReachable: true, lastOnlineAt: null } }

function setStatus(partial: Partial<NetworkStatus>) {
  status = { ...status, ...partial }
  emit()
}

// ─── Initialization (client-side only, runs once) ───

let initialized = false

function init() {
  if (initialized || typeof window === "undefined") return
  initialized = true

  setStatus({ isOnline: navigator.onLine })

  window.addEventListener("online", () => {
    setStatus({ isOnline: true, lastOnlineAt: Date.now() })
  })
  window.addEventListener("offline", () => {
    setStatus({ isOnline: false, isApiReachable: false })
  })
}

// ─── Hook ───

export function useNetworkStatus() {
  const queryClient = useQueryClient()
  const wasOfflineRef = useRef(false)

  // Ensure initialization
  useEffect(() => { init() }, [])

  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Auto-refresh key data after coming back online
  useEffect(() => {
    if (!current.isOnline) {
      wasOfflineRef.current = true
      return
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false
      // Delay 500ms for connection stability
      const t = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["files"] })
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
        queryClient.invalidateQueries({ queryKey: ["folders"] })
      }, 500)
      return () => clearTimeout(t)
    }
  }, [current.isOnline, queryClient])

  return current
}

// ─── Offline Banner Component ───

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()
  const [show, setShow] = useState(false)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShow(true)
      setJustReconnected(false)
    } else if (show) {
      // Just reconnected, briefly show green bar
      setJustReconnected(true)
      const t = setTimeout(() => {
        setShow(false)
        setJustReconnected(false)
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] text-center text-sm py-1.5 px-4 transition-colors duration-300 ${
        justReconnected
          ? "bg-green-500 text-white"
          : "bg-yellow-500 text-yellow-950"
      }`}
    >
      {justReconnected ? "✅ Network restored" : "⚠️ Network disconnected, retrying..."}
    </div>
  )
}
