"use client"

import { useEffect, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import { Bell } from "lucide-react"
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
  if (seconds < 60) return "刚刚"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(dateStr).toLocaleDateString("zh-CN")
}

export function TopNav() {
  const { theme, setTheme } = useTheme()
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
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">AI Drive</span>
      </div>

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden w-64 justify-start text-muted-foreground sm:flex"
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true })
          )
        }}
      >
        <span className="mr-auto">搜索…</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
      </Button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#4F5BD5] text-[10px] text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">通知</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-500 hover:underline">
                  全部已读
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无通知</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "px-4 py-3 border-b hover:bg-accent/50 cursor-pointer",
                      !n.read && "bg-blue-500/5"
                    )}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{formatRelativeTime(n.createdAt)}</p>
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
          aria-label="切换主题"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                U
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>个人信息</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings">设置</a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { import("next-auth/react").then(m => m.signOut({ callbackUrl: "/" })) }}>退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
