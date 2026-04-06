"use client"

import { useState, useEffect } from "react"

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 w-full bg-yellow-500 text-black text-center text-sm py-1 z-[9999]">
      🔴 网络已断开，部分功能不可用
    </div>
  )
}
