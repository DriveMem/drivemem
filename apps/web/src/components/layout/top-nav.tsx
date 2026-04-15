"use client"

import { useEffect, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import { Bell, Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useLayoutStore } from "@/stores/layout-store"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}  min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}  hours ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}  days ago`
  return new Date(dateStr).toLocaleDateString("zh-CN")
}

export function TopNav() {
  const { theme, setTheme } = useTheme()
  const { setMobileSidebarOpen } = useLayoutStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch("/api/notifications")
      setNotifications(data?.notifications ?? [])
    } catch {}
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiFetch("/api/notifications/unread-count")
      setUnreadCount(data?.count ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications, fetchUnreadCount])

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" })
      await Promise.all([fetchNotifications(), fetchUnreadCount()])
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" })
      await Promise.all([fetchNotifications(), fetchUnreadCount()])
    } catch {}
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4">
      {/* Hamburger + Logo */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI Drive</span>
      </div>

      {/* Search trigger */}
      <button
        className="hidden sm:flex items-center gap-2 w-64 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true })
          )
        }}
      >
        <span className="mr-auto">Search…</span>
        <kbd className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-400">⌘K</kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-500 text-[10px] text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-500 hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">No notifications</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer",
                      !n.read && "bg-brand-500/5"
                    )}
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{n.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{n.message}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm font-medium">
                U
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { import("next-auth/react").then(m => m.signOut({ callbackUrl: "/" })) }}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
