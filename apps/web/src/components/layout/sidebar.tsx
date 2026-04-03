"use client"
import { FileText, MessageSquare, Settings, PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/stores/layout-store"
import { FolderTree } from "@/components/file/folder-tree"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
const navItems = [{ href: "/files", icon: FileText, label: "我的文件" }, { href: "/chat", icon: MessageSquare, label: "AI 对话" }, { href: "/settings", icon: Settings, label: "设置" }] as const
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, setMobileMenuOpen } = useLayoutStore()
  const pathname = usePathname()

  const handleNavClick = () => {
    // Close mobile menu on navigation
    setMobileMenuOpen(false)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center justify-between px-3 border-b border-border">
          {!sidebarCollapsed && <span className="text-lg font-bold">AI Drive</span>}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 hidden md:flex">{sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button>
          {/* Mobile: always show title */}
          <span className="text-lg font-bold md:hidden">AI Drive</span>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const btn = (<Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full justify-start gap-2", sidebarCollapsed && "md:justify-center md:px-2")} size={sidebarCollapsed ? "icon" : "default"} asChild><Link href={item.href} onClick={handleNavClick}><item.icon className="h-4 w-4 flex-shrink-0" />{(!sidebarCollapsed || true) && <span className={cn(sidebarCollapsed && "md:hidden")}>{item.label}</span>}</Link></Button>)
            if (sidebarCollapsed) return (<Tooltip key={item.href}><TooltipTrigger asChild>{btn}</TooltipTrigger><TooltipContent side="right" className="hidden md:block">{item.label}</TooltipContent></Tooltip>)
            return <div key={item.href}>{btn}</div>
          })}
        </nav>
        {pathname.startsWith("/files") && (<div className={cn("flex-1 overflow-auto border-t border-border p-2", sidebarCollapsed && "hidden md:hidden")}><p className="px-2 py-1 text-xs font-medium text-muted-foreground">文件夹</p><FolderTree /></div>)}
      </div>
    </TooltipProvider>
  )
}
