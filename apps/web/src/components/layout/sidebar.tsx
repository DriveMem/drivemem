"use client"

import { FileText, MessageSquare, CalendarDays, Settings, PanelLeftClose, PanelLeft, Code, Tag, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/stores/layout-store"
import { FolderTree } from "@/components/file/folder-tree"
import { useTags } from "@/hooks/use-tags"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/files", icon: FileText, label: "My Files" },
  { href: "/chat", icon: MessageSquare, label: "AI Chat" },
  { href: "/compile", icon: Sparkles, label: "Briefing" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline" },
  { href: "/developers", icon: Code, label: "Developers" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, setMobileSidebarOpen, activeTagFilter, setActiveTagFilter } = useLayoutStore()
  const pathname = usePathname()
  const { data: tags = [] } = useTags()
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center justify-between px-3 border-b border-zinc-200 dark:border-zinc-800">
          {!sidebarCollapsed && <span className="text-lg font-bold text-brand-500">AI Drive</span>}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/") || (item.href === "/files" && pathname === "/dashboard")
            const btn = (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 relative rounded-lg",
                  sidebarCollapsed && "justify-center px-2",
                  isActive
                    ? "bg-brand-50 dark:bg-brand-500/10 text-zinc-900 dark:text-zinc-100 font-medium border-l-2 border-brand-500 rounded-l-none"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-l-2 border-transparent"
                )}
                size={sidebarCollapsed ? "icon" : "default"}
                asChild
              >
                <Link href={item.href} onClick={() => setMobileSidebarOpen(false)}>
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-brand-500" : "")} />
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
          <div className="flex-1 overflow-auto border-t border-zinc-200 dark:border-zinc-800 p-2">
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Projects</p>
            <FolderTree />
            {tags.length > 0 ? (
              <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1 px-2 py-1">
                  {activeTagFilter && (
                    <button
                      onClick={() => setActiveTagFilter(null)}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                    >
                      All ×
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
              <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-2 px-2">
                <p className="py-2 text-xs text-zinc-400 text-center">
                  Right-click to add tags
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
