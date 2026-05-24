"use client"

import { Home, BookOpen, MessageCircle, Settings, Inbox } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUnreadHandoffs } from "@/hooks/use-unread-handoffs"

const tabs = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/files", icon: BookOpen, label: "Files" },
  { href: "/inbox", icon: Inbox, label: "Inbox" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/"
  if (href === "/files") return pathname.startsWith("/files") || pathname.startsWith("/graph")
  if (href === "/inbox") return pathname === "/inbox" || pathname.startsWith("/inbox/")
  if (href === "/chat") return pathname.startsWith("/chat")
  if (href === "/settings") return pathname.startsWith("/settings")
  return pathname === href
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const unreadCount = useUnreadHandoffs()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2.5 px-4 min-h-[44px] text-[10px] font-medium transition-colors",
              active
                ? "text-brand-500"
                : "text-zinc-400 dark:text-zinc-500"
            )}
          >
            <span className="relative">
              <tab.icon className={cn("h-5 w-5", active && "text-brand-500")} />
              {tab.href === "/inbox" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
