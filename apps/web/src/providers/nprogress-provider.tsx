"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import NProgress from "nprogress"
import "nprogress/nprogress.css"

NProgress.configure({ showSpinner: false, trickleSpeed: 200 })

export function NProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    NProgress.done()
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a")
      if (anchor && anchor.href && anchor.target !== "_blank" && !anchor.download) {
        const url = new URL(anchor.href, window.location.origin)
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          NProgress.start()
        }
      }
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])

  return <>{children}</>
}
