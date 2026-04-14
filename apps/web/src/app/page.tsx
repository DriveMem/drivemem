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
  { icon: Upload, title: "Store knowledge", desc: "Upload files, save conversations, AI auto-indexes everything" },
  { icon: Search, title: "AI auto-linking", desc: "Semantic search, cross-file insights, auto-discovered connections" },
  { icon: MessageSquare, title: "Seamless agent handoff", desc: "Any AI tool connects to your knowledge base — tasks never lose context" },
] as const

const FEATURES = [
  { icon: MessageSquare, title: "Cross-agent task handoff", desc: "Research with one AI, write with another. Context Packet bundles your context — the next agent picks up where you left off.", reverse: false },
  { icon: Lightbulb, title: "AI discovers connections", desc: "AI automatically analyzes links, contradictions, and trends across your files. Proactive insights, delivered.", reverse: true },
  { icon: Quote, title: "Auto-synced profile", desc: "Set your role, goals, and preferences once. Every connected agent knows you. No more re-introductions.", reverse: false },
  { icon: FileSearch, title: "Project memory", desc: "Organize knowledge by project. Each project has a brief, goal, and status — agents understand the full picture instantly.", reverse: true },
  { icon: Command, title: "MCP / API / CLI access", desc: "Standard MCP protocol, REST API, CLI tools. Any AI agent connects with a single config line.", reverse: false },
  { icon: History, title: "Knowledge timeline", desc: "Track all knowledge activity — uploads, AI analysis, conversations, insights. Full audit trail.", reverse: true },
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

      {/* ===== grid bg ===== */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,91,213,.1),transparent)]" />

      {/* ===== Hero ===== */}
      <section className="relative z-10 flex min-h-[90vh] flex-col items-center justify-center bg-gradient-to-b from-[#F4F5FD] to-white px-6 text-center">
        <FadeIn>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
            Every agent, one memory
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#6B6966] sm:text-xl">
            Your background, preferences, and projects — shared with every agent you connect.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/signup">Get started free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 border-[#E5E4E1] px-8 text-base text-[#6B6966] hover:bg-[#F8F7F5] hover:text-[#1C1B18]">
              <Link href="#features">Learn more</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-8 text-base text-[#6B6966] hover:text-[#1C1B18]">
              <Link href="/signup">Try free →</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#6B6966] text-center">✨ Free 5GB storage · 50 AI chats/day · MCP / API / CLI</p>
        </FadeIn>
      </section>

      {/* ===== Product Preview ===== */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-5xl" style={{ perspective: "1200px" }}>
          <div className="rounded-xl border border-[#E5E4E1] bg-white p-1 shadow-2xl shadow-[#4F5BD5]/10 ring-1 ring-[#4F5BD5]/10" style={{ transform: "rotateX(2deg)" }}>
            <div className="flex items-center gap-1.5 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-[#6B6966]">drivemem.cloud</span>
            </div>
                        <img src="/screenshots/dashboard.png" alt="AI Drive Dashboard" className="w-full rounded-b-lg" />
          </div>
        </div>
      </section>

      {/* Value Cards section removed — AI Feature Showcase below is more specific */}

      {/* ===== Scenario Cards ===== */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Every agent you use, sharing one memory</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[#6B6966]">Whether you use ChatGPT, Claude, Cursor, or your own agents — AI Drive gives them shared memory.</p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: "📄", title: "Students", desc: "Upload references, AI finds key arguments and compares perspectives" },
              { emoji: "💼", title: "Professionals", desc: "Upload project docs, generate reports with cited sources" },
              { emoji: "🔬", title: "Researchers", desc: "Upload papers, AI discovers connections and contradictions" },
              { emoji: "📊", title: "Founders", desc: "Upload competitive intel, get structured comparison reports" },
              { emoji: "🤖", title: "AI developers", desc: "Connect your AI agents to personal knowledge via API and MCP" },
              { emoji: "📚", title: "Lifelong learners", desc: "Unified notes and resources, AI builds your knowledge graph" },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-[#E5E4E1] bg-white p-6 transition hover:shadow-lg hover:shadow-black/5">
                <span className="text-3xl">{s.emoji}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
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
              <div key={s.title} className="relative flex flex-col items-center text-center">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <ChevronRight className="absolute -right-5 top-8 hidden h-6 w-6 text-[#6B6966] sm:block" />
                )}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F5BD5]/10 text-[#4F5BD5]">
                  <s.icon className="h-7 w-7" />
                </div>
                <span className="mt-2 text-xs font-medium text-[#6B6966]">Step {i + 1}</span>
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
          <p className="text-center text-[#6B6966] mb-12 max-w-2xl mx-auto">AI Drive doesn&apos;t just store — it understands your knowledge</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-xl border border-[#E5E4E1] bg-white p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4F5BD5]/10 mb-4">
                  <f.icon className="h-6 w-6 text-[#4F5BD5]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1B18] mb-2">{f.title}</h3>
                <p className="text-sm text-[#6B6966] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative z-10 px-6 py-32 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold sm:text-4xl">One memory. Every agent knows you.</h2>
          <div className="mt-8">
            <Button asChild size="lg" className="h-12 px-10 text-base bg-[#4F5BD5] hover:bg-[#3D49C4] text-white">
              <Link href="/signup">Get started free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#6B6966]">✨ Free 5GB storage · 50 AI chats/day · MCP / API / CLI</p>
        </FadeIn>
      </section>

      {/* ===== Footer (4-column) ===== */}
      <footer className="relative z-10 border-t border-[#E5E4E1] bg-[#F8F7F5]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <h3 className="text-lg font-bold text-[#1C1B18]">AI Drive</h3>
              <p className="mt-2 text-sm text-[#6B6966]">Every agent, one memory</p>
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
          <div className="mt-8 border-t border-[#E5E4E1] pt-6 text-center text-xs text-[#6B6966]">
            © {new Date().getFullYear()} AI Drive. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
