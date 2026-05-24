"use client"

<<<<<<< HEAD
import { Home, BookOpen, MessageCircle, Plug, Settings, PanelLeftClose, PanelLeft, Inbox, Users, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/stores/layout-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useUnreadHandoffs } from "@/hooks/use-unread-handoffs"
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher"
=======
import { Home, BookOpen, MessageCircle, Plug, Settings, PanelLeftClose, PanelLeft, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/stores/layout-store"
import { useUnreadHandoffs } from "@/hooks/use-unread-handoffs"
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/files", icon: BookOpen, label: "Knowledge" },
  { href: "/inbox", icon: Inbox, label: "Inbox" },
  { href: "/developers", icon: Plug, label: "Connect" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const

const workspaceNavItems = [
  { href: "/workspace/members", icon: Users, label: "Members" },
  { href: "/workspace/settings", icon: SlidersHorizontal, label: "Workspace Settings" },
] as const

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  switch (href) {
    case "/dashboard":
      return pathname === "/dashboard" || pathname === "/"
    case "/files":
      return pathname.startsWith("/files") || pathname.startsWith("/graph")
    case "/chat":
      return pathname.startsWith("/chat")
    case "/inbox":
      return pathname === "/inbox" || pathname.startsWith("/inbox/")
    case "/developers":
      return pathname === "/developers" || pathname.startsWith("/developers/")
    case "/settings":
      return pathname === "/settings" || pathname.startsWith("/settings/")
    case "/workspace/members":
      return pathname === "/workspace/members"
    case "/workspace/settings":
      return pathname === "/workspace/settings"
    default:
      return pathname === href
  }
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, setMobileSidebarOpen } = useLayoutStore()
  const { currentWorkspace } = useWorkspaceStore()
  const pathname = usePathname()
  const unreadCount = useUnreadHandoffs()
<<<<<<< HEAD
  const showWorkspaceNav = currentWorkspace?.type === "team"
=======
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center justify-between px-3 border-b border-zinc-200 dark:border-zinc-800">
          {!sidebarCollapsed && <span className="text-title font-bold text-brand-500">DriveMem</span>}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <WorkspaceSwitcher />
        <nav className="flex flex-col gap-0.5 p-2">
          {navItems.map((item) => {
            const isActive = isNavActive(pathname, item.href)
            const btn = (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 relative rounded-lg transition-all duration-200",
                  sidebarCollapsed && "justify-center px-2",
                  isActive
                    ? "bg-brand-50 dark:bg-brand-500/10 text-zinc-900 dark:text-zinc-100 font-medium border-l-2 border-brand-500 rounded-l-none"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-l-2 border-transparent"
                )}
                size={sidebarCollapsed ? "icon" : "default"}
                asChild
              >
                <Link href={item.href} onClick={() => setMobileSidebarOpen(false)}>
                  <span className="relative">
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-brand-500" : "")} />
                    {item.href === "/inbox" && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>
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
        {showWorkspaceNav && (
          <div className="px-2 pb-2">
            {!sidebarCollapsed && (
              <p className="px-3 py-1 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Workspace</p>
            )}
            <div className="flex flex-col gap-0.5">
              {workspaceNavItems.map((item) => {
                const isActive = isNavActive(pathname, item.href)
                const btn = (
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 relative rounded-lg transition-all duration-200",
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
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
