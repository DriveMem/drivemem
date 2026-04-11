"use client"

import { FileText, MessageSquare, CalendarDays, Settings, PanelLeftClose, PanelLeft, Code, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/stores/layout-store"
import { FolderTree } from "@/components/file/folder-tree"
import { useTags } from "@/hooks/use-tags"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/files", icon: FileText, label: "我的文件" },
  { href: "/chat", icon: MessageSquare, label: "AI 对话" },
  { href: "/timeline", icon: CalendarDays, label: "时间线" },
  { href: "/developers", icon: Code, label: "开发者" },
  { href: "/settings", icon: Settings, label: "设置" },
] as const

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, setMobileSidebarOpen, activeTagFilter, setActiveTagFilter } = useLayoutStore()
  const pathname = usePathname()
  const { data: tags = [] } = useTags()
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
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/") || (item.href === "/files" && pathname === "/dashboard")
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
                <Link href={item.href} onClick={() => setMobileSidebarOpen(false)}>
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
        {!sidebarCollapsed && !pathname?.startsWith("/chat") && !pathname?.startsWith("/settings") && !pathname?.startsWith("/timeline") && (
          <div className="flex-1 overflow-auto border-t border-border p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">文件夹</p>
            <FolderTree />
            {tags.length > 0 ? (
              <div className="mt-3 border-t border-border pt-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> 标签
                </p>
                <div className="flex flex-wrap gap-1 px-2 py-1">
                  {activeTagFilter && (
                    <button
                      onClick={() => setActiveTagFilter(null)}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition"
                    >
                      全部 ×
                    </button>
                  )}
                  {tags.map((tag: any) => (
                    <button
                      key={tag.id}
                      onClick={() => setActiveTagFilter(activeTagFilter === tag.name ? null : tag.name)}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
                        activeTagFilter === tag.name
                          ? "ring-1 ring-offset-1 ring-offset-background shadow-sm"
                          : "opacity-70 hover:opacity-100"
                      )}
                      style={{
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 border-t border-border pt-2 px-2">
                <p className="py-2 text-xs text-muted-foreground text-center">
                  右键文件添加标签
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
