"use client"

import { FileText, MessageSquare, CalendarDays, Settings, PanelLeftClose, PanelLeft, Code, Tag, Sparkles, Network } from "lucide-react"
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
  { href: "/graph", icon: Network, label: "Graph" },
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
        {/* Logo area */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-white/[0.06]">
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>DriveMem</span>
              <div className="h-px w-full bg-[#5E6AD2]/30 mt-0.5" />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-white/5">
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
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
                    ? "border-l-2 border-[#5E6AD2] bg-white/[0.08] text-white font-medium rounded-l-none"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border-l-2 border-transparent"
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

        {/* Projects & Tags sections */}
        {!sidebarCollapsed && !pathname?.startsWith("/chat") && !pathname?.startsWith("/settings") && !pathname?.startsWith("/timeline") && (
          <div className="flex-1 overflow-auto border-t border-white/[0.06] p-2">
            <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-600">Projects</p>
            <FolderTree />
            {tags.length > 0 ? (
              <div className="mt-3 border-t border-white/[0.06] pt-2">
                <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-600 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1 px-2 py-1">
                  {activeTagFilter && (
                    <button
                      onClick={() => setActiveTagFilter(null)}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] transition"
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
                          ? "ring-1 ring-offset-1 ring-offset-[#0A0E1A] shadow-sm"
                          : "opacity-70 hover:opacity-100"
                      )}
                      style={{
                        backgroundColor: tag.color + "15",
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 border-t border-white/[0.06] pt-2 px-2">
                <p className="py-2 text-xs text-gray-600 text-center">
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
