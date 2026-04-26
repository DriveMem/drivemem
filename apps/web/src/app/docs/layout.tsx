"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const navItems = [
  { label: "Quick Start", href: "/docs/quickstart" },
  { label: "MCP Integration", href: "/docs/mcp" },
  { label: "API Reference", href: "/docs/api" },
  { label: "Changelog", href: "/docs/changelog" },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Derive current page name for breadcrumb
  const currentNav = navItems.find((item) => pathname.startsWith(item.href))
  const currentLabel = currentNav?.label ?? "Docs"

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
                <span className="text-white font-mono text-xs font-bold">D</span>
              </div>
              <span className="text-gray-900 font-semibold tracking-tight">DriveMem</span>
            </Link>
            <span className="text-gray-300 mx-1">/</span>
            <Link href="/docs/quickstart" className="text-gray-500 text-sm hover:text-gray-700 transition-colors">
              Docs
            </Link>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-gray-900 text-sm font-medium">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <Link
              href="/login"
              className="text-gray-500 hover:text-gray-900 text-sm transition-colors hidden sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm text-white bg-brand-500 hover:bg-brand-600 px-4 py-1.5 rounded-lg font-medium transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200/60 pt-16 px-4 pb-8
            transform transition-transform duration-200 ease-in-out
            lg:static lg:translate-x-0 lg:pt-8 lg:block lg:flex-shrink-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-[-1] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Documentation
            </p>
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-600"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
