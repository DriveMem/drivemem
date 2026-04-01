"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TopNav() {
  const { theme, setTheme } = useTheme()

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
            <DropdownMenuItem>退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
