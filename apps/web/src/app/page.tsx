"use client"

import Link from "next/link"
import { useRef, useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Upload,
  Search,
  MessageSquare,
  History,
  Command,
  Quote,
  ArrowRight,
  ChevronRight,
  Lightbulb,
  FileSearch,
} from "lucide-react"

function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Fallback: show after 800ms even if observer doesn't fire
    const timer = setTimeout(() => setVisible(true), 800)
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); clearTimeout(timer) } },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => { obs.disconnect(); clearTimeout(timer) }
  }, [])
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------- page ---------- */

const STEPS = [
  { icon: Upload, title: "Bring your knowledge", desc: "Upload docs, notes, decisions. AI indexes and connects them automatically." },
  { icon: Search, title: "AI prepares your brief", desc: "Describe your task. Smart Briefing assembles the exact knowledge your agent needs." },
  { icon: MessageSquare, title: "Any agent, full context", desc: "Connect via MCP, API, or CLI. Your agents never start from zero." },
] as const

const FEATURES = [
  { icon: MessageSquare, title: "Smart Briefing", desc: "Tell DriveMem what you need. It automatically prepares the right knowledge for any AI you use.", reverse: false },
  { icon: Lightbulb, title: "AI Knowledge Graph", desc: "AI discovers connections, contradictions, and trends across all your files. Proactive insights, delivered.", reverse: true },
  { icon: Quote, title: "Semantic Search & RAG", desc: "Search by meaning, not keywords. Ask questions, get answers with cited sources from your knowledge base.", reverse: false },
  { icon: FileSearch, title: "Agent Continuity", desc: "Switch agents mid-task. Context follows automatically.", reverse: true },
  { icon: Command, title: "MCP / API / CLI", desc: "Standard MCP protocol, REST API, CLI tools. Any AI agent connects with a single config line.", reverse: false },
  { icon: History, title: "Privacy & Security", desc: "Your knowledge stays yours. End-to-end encryption, no training on your data, full audit trail.", reverse: true },
] as const

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#1C1B18] selection:bg-[#4F5BD5]/30">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#E5E4E1] bg-white/80 px-6 py-4 backdrop-blur">
        <Link href="/" className="text-lg font-bold text-[#1C1B18]">AI Drive</Link>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">Features</a>
          <Link href="/login" className="text-sm text-[#6B6966] hover:text-[#1C1B18] transition">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-[#4F5BD5] px-4 py-2 text-sm font-medium text-white hover:bg-[#3D49C4] transition">Get started free</Link>
        </div>
      </nav>

      {/* ===== Ambient bg ===== */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,91,213,.08),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_600px_at_80%_60%,rgba(79,91,213,.04),transparent)]" />

      {/* ===== Hero ===== */}
      <section className="relative z-10 flex min-h-[90vh] flex-col items-center justify-center bg-gradient-to-b from-[#F4F5FD] to-white px-6 text-center">
        <FadeIn>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl animate-fade-in-up">
            AI Drive — Your Agent Context OS
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#6B6966] sm:text-xl tracking-wide animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
            One knowledge base. AI-compiled context. Every agent stays in sync.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-14 px-10 text-lg font-semibold bg-[#4F5BD5] hover:bg-[#3D49C4] text-white shadow-lg shadow-[#4F5BD5]/25 hover:shadow-xl hover:shadow-[#4F5BD5]/30 transition-all duration-200 hover:-translate-y-0.5">
              <Link href="/login">免费开始 <ArrowRight className="ml-1 h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 border-[#E5E4E1] px-8 text-base text-[#6B6966] hover:bg-[#F8F7F5] hover:text-[#1C1B18]">
              <Link href="#features">Learn more</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#6B6966] text-center">✨ Free 5GB storage · 50 AI chats/day · MCP / API / CLI</p>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[#9B9893] animate-fade-in-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
            <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F5BD5]/40" />Built for AI developers</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F5BD5]/40" />Open protocols</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F5BD5]/40" />Privacy-first</span>
          </div>
        </FadeIn>
      </section>

      {/* ===== Product Preview ===== */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-5xl" style={{ perspective: "1200px" }}>
          <div className="rounded-xl border border-[#E5E4E1] bg-white p-1 shadow-2xl shadow-[#4F5BD5]/10 ring-1 ring-[#4F5BD5]/10 brand-glow" style={{ transform: "rotateX(4deg)" }}>
            <div className="flex items-center gap-1.5 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-[#6B6966]">aidrive.cloud</span>
            </div>
                        <img src="/screenshots/dashboard.png" alt="AI Drive Dashboard" className="w-full rounded-b-lg" />
          </div>
        </div>
      </section>

      {/* Value Cards section removed — AI Feature Showcase below is more specific */}

      {/* ===== Scenario Cards ===== */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Built for every AI workflow</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[#6B6966]">Whether you use ChatGPT, Claude, Cursor, or your own agents — AI Drive compiles the right context for each.</p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {[
              { emoji: "🤖", title: "AI Developers", desc: "Give every agent the right context. Smart Briefing + MCP — one API call, zero prompt engineering." },
              { emoji: "📊", title: "Founders", desc: "Brief your AI on the full picture. Competitive intel, decisions, strategy — compiled into context." },
              { emoji: "🔬", title: "Researchers", desc: "Switch tools mid-research without losing context. AI connects your papers and carries insights forward." },
              { emoji: "💼", title: "Professionals", desc: "Project context that follows you. AI compiles what matters — no re-explaining to every new tool." },
              { emoji: "📄", title: "Students", desc: "Study with any AI, keep one knowledge base. Smart Briefing pulls the right references for every assignment." },
              { emoji: "📚", title: "Lifelong Learners", desc: "Your knowledge grows with you. AI connects everything you learn — any agent can tap into it." },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-[#E5E4E1] bg-white p-6 border-gradient-hover">
                <span className="text-3xl">{s.emoji}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-[#6B6966] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ===== How It Works ===== */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">How AI Drive works</h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`relative flex flex-col items-center text-center ${i < STEPS.length - 1 ? 'step-connector' : ''}`}>
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F5BD5] to-[#6775ff] text-white shadow-md shadow-[#4F5BD5]/20">
                  <s.icon className="h-8 w-8" />
                </div>
                <span className="mt-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4F5BD5]/10 text-xs font-bold text-[#4F5BD5]">{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-[#6B6966]">{s.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ===== Feature Highlights (2x3 Grid) ===== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <h2 className="text-3xl font-bold text-center text-[#1C1B18] mb-4">Core features</h2>
          <p className="text-center text-[#6B6966] mb-12 max-w-2xl mx-auto">AI Drive doesn&apos;t just store — it compiles the right context for every task</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-xl border border-[#E5E4E1] bg-white p-7 border-gradient-hover">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 mb-5">
                  <f.icon className="h-6 w-6 text-[#4F5BD5]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1B18] mb-3">{f.title}</h3>
                <p className="text-sm text-[#6B6966] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative z-10 px-6 py-32 text-center bg-gradient-to-b from-transparent via-[#F4F5FD]/50 to-transparent">
        <FadeIn>
          <h2 className="text-3xl font-bold sm:text-4xl">One knowledge base. Every agent, full context.</h2>
          <div className="mt-8">
            <Button asChild size="lg" className="h-14 px-12 text-lg font-semibold bg-[#4F5BD5] hover:bg-[#3D49C4] text-white shadow-lg shadow-[#4F5BD5]/25 hover:shadow-xl hover:shadow-[#4F5BD5]/30 transition-all duration-200 hover:-translate-y-0.5">
              <Link href="/signup">Get started free <ArrowRight className="ml-1 h-5 w-5" /></Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#6B6966]">✨ Free 5GB storage · 50 AI chats/day · MCP / API / CLI</p>
        </FadeIn>
      </section>

      {/* ===== Footer (4-column) ===== */}
      <footer className="relative z-10 border-t border-transparent bg-[#F8F7F5]" style={{ borderImage: 'linear-gradient(to right, transparent, rgba(79,91,213,0.2), transparent) 1' }}>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <h3 className="text-lg font-bold text-[#1C1B18]">AI Drive</h3>
              <p className="mt-2 text-sm text-[#6B6966]">Your Agent Context OS</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><a href="#features" className="hover:text-[#4F5BD5] transition">Features</a></li>
                <li><Link href="/login" className="hover:text-[#4F5BD5] transition">Sign in</Link></li>
                <li><Link href="/signup" className="hover:text-[#4F5BD5] transition">Sign up free</Link></li>
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">Developers</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/developers#api" className="hover:text-[#4F5BD5] transition">API Docs</Link></li>
                <li><Link href="/developers#mcp" className="hover:text-[#4F5BD5] transition">MCP Protocol</Link></li>
                <li><Link href="/developers#cli" className="hover:text-[#4F5BD5] transition">CLI Tools</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-[#1C1B18] mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-[#6B6966]">
                <li><Link href="/terms" className="hover:text-[#4F5BD5] transition">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-[#4F5BD5] transition">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 border-t border-[#E5E4E1] pt-6 flex flex-col items-center gap-3">
            <Button asChild size="sm" className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white px-6">
              <Link href="/login">免费开始</Link>
            </Button>
            <p className="text-xs text-[#6B6966]">
              © {new Date().getFullYear()} AI Drive. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
