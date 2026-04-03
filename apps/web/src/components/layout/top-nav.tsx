"use client"
import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Sun, Moon, Search, LogOut, User, Settings, FileText, X, Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { useLayoutStore } from "@/stores/layout-store"

interface SearchResult { fileId: string; filename: string; snippet: string; score: number }

export function TopNav() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { mobileMenuOpen, setMobileMenuOpen } = useLayoutStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.get<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`)
        setResults(data.results ?? [])
      } catch (e) {
        console.debug("Search failed:", e)
        setResults([])
      }
      setSearching(false)
    }, 300)
    return () => clearTimeout(timeoutRef.current)
  }, [query])

  function closeSearch() { setSearchOpen(false); setQuery(""); setResults([]) }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-3 md:px-4 gap-2">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile hamburger */}
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/files" className="text-lg font-bold hidden sm:block">AI Drive</Link>
      </div>

      {/* Search - icon on mobile, full bar on desktop */}
      <div className="flex-1 max-w-md mx-2 md:mx-4 relative">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              placeholder="搜索文件内容..." className="pl-9 pr-8 h-9" />
            <Button variant="ghost" size="icon" onClick={closeSearch} className="absolute right-0.5 top-0.5 h-8 w-8"><X className="h-3.5 w-3.5" /></Button>
            {(results.length > 0 || searching) && (
              <div className="absolute top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg z-50 max-h-80 overflow-auto">
                {searching && <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />搜索中...</div>}
                {results.map((r, i) => (
                  <button key={i} onClick={() => { router.push(`/chat?file=${r.fileId}`); closeSearch() }}
                    className="flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-accent text-sm">
                    <FileText className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.filename}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.snippet}</p>
                    </div>
                  </button>
                ))}
                {!searching && query && results.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">没有找到相关内容</p>}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: icon only */}
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="h-8 w-8 sm:hidden">
              <Search className="h-4 w-4" />
            </Button>
            {/* Desktop: full search bar */}
            <Button variant="outline" onClick={() => setSearchOpen(true)} className="hidden sm:flex w-full justify-start text-muted-foreground h-9 gap-2">
              <Search className="h-4 w-4" />搜索文件内容...
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><User className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5"><p className="text-sm font-medium">{session.user.name}</p><p className="text-xs text-muted-foreground">{session.user.email}</p></div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/settings"><Settings className="mr-2 h-4 w-4" />设置</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}><LogOut className="mr-2 h-4 w-4" />退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
