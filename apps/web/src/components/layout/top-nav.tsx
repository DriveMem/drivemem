"use client"

import { useEffect, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import { Bell, Menu, Sun, Moon, FileText, MessageSquare, AlertTriangle, Info, ExternalLink } from "lucide-react"
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

type TimeGroup = "Today" | "This Week" | "Earlier"

function getTimeGroup(dateStr: string): TimeGroup {
  const now = new Date()
  const date = new Date(dateStr)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  if (date >= today) return "Today"
  if (date >= weekStart) return "This Week"
  return "Earlier"
}

const GROUP_ORDER: TimeGroup[] = ["Today", "This Week", "Earlier"]

function groupNotifications(notifications: Notification[]): { group: TimeGroup; items: Notification[] }[] {
  const groups = new Map<TimeGroup, Notification[]>()
  for (const n of notifications) {
    const g = getTimeGroup(n.createdAt)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(n)
  }
  return GROUP_ORDER.filter(g => groups.has(g)).map(g => ({ group: g, items: groups.get(g)! }))
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`
  return new Date(dateStr).toLocaleDateString("zh-CN")
}

export function TopNav() {
  const { theme, setTheme } = useTheme()
  const { setMobileSidebarOpen } = useLayoutStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch("/api/notifications", { silent: true })
      setNotifications(data?.notifications ?? [])
    } catch {}
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiFetch("/api/notifications/unread-count", { silent: true })
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
    // Optimistic update: immediately zero badge and mark all read
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST", body: JSON.stringify({}) })
    } catch {
      // Revert on failure
      await Promise.all([fetchNotifications(), fetchUnreadCount()])
    }
  }

  const getNotificationCta = (type: string): { label: string; icon: React.ReactNode } | null => {
    switch (type) {
      case 'file_indexed':
      case 'file_updated':
        return { label: 'View file', icon: <FileText className="h-3 w-3" /> }
      case 'chat_message':
      case 'chat_mention':
        return { label: 'Open chat', icon: <MessageSquare className="h-3 w-3" /> }
      case 'storage_warning':
      case 'storage_limit':
        return { label: 'Manage storage', icon: <AlertTriangle className="h-3 w-3" /> }
      case 'summary_generated':
      case 'ai_analysis':
      case 'insight_ready':
        return { label: 'See details', icon: <Info className="h-3 w-3" /> }
      default:
        return { label: 'View', icon: <ExternalLink className="h-3 w-3" /> }
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4">
      {/* Hamburger + Logo */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-title font-bold text-zinc-900 dark:text-zinc-100">DriveMem</span>
      </div>

      {/* Search trigger */}
      <button
        className="hidden sm:flex items-center gap-2 w-64 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-body text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all duration-normal focus-within:shadow-md focus-within:ring-1 focus-within:ring-primary/20"
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true })
          )
        }}
      >
        <span className="mr-auto">Search knowledge…</span>
        <kbd className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-micro text-zinc-400">⌘K</kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:scale-110 transition-transform duration-200">
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
                groupNotifications(notifications).map(({ group, items }) => (
                  <div key={group}>
                    <div className="px-4 pt-3 pb-1 first:pt-2">
                      <span className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">{group}</span>
                    </div>
                    {items.map(n => {
                  const cta = getNotificationCta(n.type)
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead(n.id)}
                      className={cn(
                        "relative px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors",
                        !n.read && "bg-blue-50/80 dark:bg-blue-950/20",
                        !n.read && "pl-7"
                      )}
                    >
                      {/* Unread blue dot */}
                      {!n.read && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      <p className={cn(
                        "text-sm text-zinc-900 dark:text-zinc-100",
                        !n.read ? "font-semibold" : "font-medium"
                      )}>{n.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{n.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500" title={new Date(n.createdAt).toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}>{formatRelativeTime(n.createdAt)}</p>
                        {cta && (
                          <button
                            onClick={(e) => { e.stopPropagation() }}
                            className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium"
                          >
                            {cta.icon}
                            {cta.label}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
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
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm font-medium transition-all duration-200 hover:ring-2 hover:ring-primary/20">
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
