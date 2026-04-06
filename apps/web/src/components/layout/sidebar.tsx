"use client"

import { useEffect, useState } from "react"
import { FileText, MessageSquare, CalendarDays, Settings, PanelLeftClose, PanelLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/stores/layout-store"
import { FolderTree } from "@/components/file/folder-tree"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { UserAvatar } from "@/components/user/user-avatar"
import { useTags, useCreateTag, useDeleteTag, TAG_COLORS, TAG_COLOR_MAP, type Tag } from "@/hooks/use-tags"

const navItems = [
  { href: "/dashboard", icon: FileText, label: "我的文件" },
  { href: "/chat", icon: MessageSquare, label: "AI 对话" },
  { href: "/timeline", icon: CalendarDays, label: "时间线" },
  { href: "/trash", icon: Trash2, label: "🗑️ 回收站" },
  { href: "/settings", icon: Settings, label: "设置" },
] as const

function TagSection() {
  const { data: tags = [] } = useTags()
  const createTag = useCreateTag()
  const deleteTag = useDeleteTag()
  const { filterTagId, setFilterTag } = useLayoutStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("blue")

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-medium text-muted-foreground">🏷️ 标签</p>
        <button onClick={() => setShowCreate(!showCreate)} className="text-xs text-muted-foreground hover:text-foreground">+</button>
      </div>
      {showCreate && (
        <div className="px-2 py-1 space-y-1.5">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="标签名称" className="w-full text-xs bg-transparent border border-border rounded px-2 py-1 outline-none focus:border-primary" onKeyDown={e => {
            if (e.key === "Enter" && newName.trim()) { createTag.mutate({ name: newName.trim(), color: newColor }); setNewName(""); setShowCreate(false) }
            if (e.key === "Escape") setShowCreate(false)
          }} autoFocus />
          <div className="flex gap-1">
            {TAG_COLORS.map(c => (
              <button key={c.value} onClick={() => setNewColor(c.value)}
                className={cn("w-5 h-5 rounded-full border-2 transition-all", TAG_COLOR_MAP[c.value]?.bg, newColor === c.value ? "border-foreground scale-110" : "border-transparent")} />
            ))}
          </div>
        </div>
      )}
      <div className="space-y-0.5">
        {filterTagId && (
          <button onClick={() => setFilterTag(null)} className="w-full text-left px-2 py-1 text-xs text-blue-500 hover:bg-accent/50 rounded">
            ✕ 清除筛选
          </button>
        )}
        {tags.map((tag: Tag) => {
          const colors = TAG_COLOR_MAP[tag.color] || TAG_COLOR_MAP.blue
          const isActive = filterTagId === tag.id
          return (
            <div key={tag.id} className={cn("group flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-accent/50 text-xs", isActive && "bg-accent")}
              onClick={() => setFilterTag(isActive ? null : tag.id)}>
              <span className={cn("w-2.5 h-2.5 rounded-full", colors.bg, colors.border, "border")} />
              <span className="flex-1 truncate">{tag.name}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteTag.mutate(tag.id) }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
}

function UserInfo() {
  const { sidebarCollapsed } = useLayoutStore()
  const [userName, setUserName] = useState<string>("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    apiFetch("/api/users/me")
      .then((data: any) => {
        if (data?.name) setUserName(data.name)
        if (data?.avatarUrl) setAvatarUrl(data.avatarUrl)
      })
      .catch(() => {})
  }, [])

  if (!userName && !avatarUrl) return null

  return (
    <div className="px-3 py-2 border-t border-border">
      <div className={cn("flex items-center gap-2", sidebarCollapsed && "justify-center")}>
        <UserAvatar name={userName} avatarUrl={avatarUrl} size={sidebarCollapsed ? 28 : 24} />
        {!sidebarCollapsed && (
          <span className="text-xs font-medium truncate">{userName}</span>
        )}
      </div>
    </div>
  )
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
        {!sidebarCollapsed && !pathname?.startsWith("/chat") && !pathname?.startsWith("/trash") && !pathname?.startsWith("/settings") && (
          <div className="flex-1 overflow-auto border-t border-border p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">文件夹</p>
            <FolderTree />
            <TagSection />
          </div>
        )}
        <UserInfo />
        <StorageBar />
      </div>
    </TooltipProvider>
  )
}
