"use client"

import { useEffect, useState } from "react"
import { FileText, MessageSquare, CalendarDays, Settings, PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/stores/layout-store"
import { FolderTree } from "@/components/file/folder-tree"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"

const navItems = [
  { href: "/dashboard", icon: FileText, label: "我的文件" },
  { href: "/chat", icon: MessageSquare, label: "AI 对话" },
  { href: "/timeline", icon: CalendarDays, label: "时间线" },
  { href: "/settings", icon: Settings, label: "设置" },
] as const

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
}

function StorageBar() {
  const { sidebarCollapsed } = useLayoutStore()
  const [storageUsed, setStorageUsed] = useState<number>(0)
  const [storageLimit, setStorageLimit] = useState<number>(5 * 1024 * 1024 * 1024) // 5 GB default

  useEffect(() => {
    apiFetch("/api/users/me")
      .then((data: any) => {
        if (data?.storageUsed != null) setStorageUsed(Number(data.storageUsed))
        if (data?.storageLimit != null) setStorageLimit(Number(data.storageLimit))
      })
      .catch(() => {})
  }, [])

  const pct = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0
  const barColor = pct > 95 ? "bg-red-500" : pct > 80 ? "bg-orange-500" : "bg-blue-500"

  return (
    <div className="px-3 py-3 border-t border-border">
      {!sidebarCollapsed && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>存储用量</span>
          <span>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore()
  const pathname = usePathname()
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center justify-between px-3 border-b border-border">
          {!sidebarCollapsed && <span className="text-lg font-bold">AI Drive</span>}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            const btn = (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  sidebarCollapsed && "justify-center px-2",
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                size={sidebarCollapsed ? "icon" : "default"}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              </Button>
            )
            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return <div key={item.href}>{btn}</div>
          })}
        </nav>
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-auto border-t border-border p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">文件夹</p>
            <FolderTree />
          </div>
        )}
        <StorageBar />
      </div>
    </TooltipProvider>
  )
}
