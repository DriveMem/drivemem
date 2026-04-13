"use client"

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"

interface NetworkStatus {
  /** 浏览器报告的在线状态 */
  isOnline: boolean
  /** API 是否可达（仅在 isOnline 时有意义） */
  isApiReachable: boolean
  /** 上一次成功连接的时间 */
  lastOnlineAt: number | null
}

// ─── 外部 store（避免 SSR hydration mismatch）───

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

// ─── 初始化（仅客户端运行一次）───

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

  // 确保初始化
  useEffect(() => { init() }, [])

  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // 恢复上线后自动刷新关键数据
  useEffect(() => {
    if (!current.isOnline) {
      wasOfflineRef.current = true
      return
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false
      // 延迟 500ms 让连接稳定
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

// ─── Offline Banner 组件 ───

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()
  const [show, setShow] = useState(false)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShow(true)
      setJustReconnected(false)
    } else if (show) {
      // 刚恢复，短暂显示绿色横条
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
      {justReconnected ? "✅ 网络已恢复" : "⚠️ 网络连接中断，正在重试..."}
    </div>
  )
}
