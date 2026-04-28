"use client"

import { Upload, Terminal, Globe, MessageCircle } from "lucide-react"
import Link from "next/link"

interface DashboardEmptyStateProps {
  onUpload: () => void
}

export function DashboardEmptyState({ onUpload }: DashboardEmptyStateProps) {
  return (
    <div className="py-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">Welcome to DriveMem</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your AI agents&apos; shared memory. Upload files, ask questions, and connect your AI tools.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Upload Files — primary action */}
        <button
          onClick={onUpload}
          className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 hover:border-primary/60 hover:shadow-sm transition text-center group"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Upload Files</div>
            <div className="text-xs text-muted-foreground mt-1">Drop docs, PDFs, or notes to get started</div>
          </div>
        </button>

        {/* Try Chat */}
        <Link
          href="/chat?new=1"
          className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 hover:border-violet-400 hover:shadow-sm transition text-center group"
        >
          <div className="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <MessageCircle className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Try Chat</div>
            <div className="text-xs text-muted-foreground mt-1">Ask AI about your knowledge</div>
          </div>
        </Link>

        {/* Connect AI Tools */}
        <Link
          href="/developers"
          className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-primary/50 hover:shadow-sm transition text-center group"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Terminal className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Connect AI Tools</div>
            <div className="text-xs text-muted-foreground mt-1">Cursor, Claude, ChatGPT via MCP</div>
          </div>
        </Link>

        {/* Connect Google Drive */}
        <Link
          href="/settings?tab=connections"
          className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-primary/50 hover:shadow-sm transition text-center group"
        >
          <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Globe className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Connect Google Drive</div>
            <div className="text-xs text-muted-foreground mt-1">Sync files automatically</div>
          </div>
        </Link>
      </div>

      <div className="text-center mt-6">
        <Link
          href="/docs/quickstart"
          className="text-sm text-muted-foreground hover:text-primary transition"
        >
          Read the quickstart guide →
        </Link>
      </div>
    </div>
  )
}
