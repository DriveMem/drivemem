"use client"

import { Upload, Terminal, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

interface WelcomeHeroProps {
  onUpload: () => void
}

export function WelcomeHero({ onUpload }: WelcomeHeroProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 md:py-16 mb-8 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Icon cluster */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        Welcome to AI Drive
      </h1>
      <p className="text-lg text-primary/80 font-medium mb-1">
        Your AI&apos;s Memory
      </p>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Upload your first file or connect an AI tool to get started.
        AI Drive remembers everything so your AI tools don&apos;t have to.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <Upload className="h-4 w-4" />
          Upload a File
        </button>
        <Link
          href="/developers"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
        >
          <Terminal className="h-4 w-4" />
          Connect AI Tool
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

/**
 * Collapsed banner version for Phase 2 (files=1-3, no agent yet)
 */
interface WelcomeBannerProps {
  onDismiss?: () => void
}

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/15 bg-primary/5 animate-in fade-in duration-300">
      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-sm text-foreground">
        Great start! Connect an AI tool to unlock insights.
      </span>
      <Link
        href="/developers"
        className="ml-auto text-sm font-medium text-primary hover:underline whitespace-nowrap"
      >
        Connect AI Tool →
      </Link>
    </div>
  )
}
