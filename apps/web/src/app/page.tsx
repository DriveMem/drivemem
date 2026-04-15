"use client"

import Link from "next/link"
import { useRef, useEffect, useState, type ReactNode } from "react"
import {
  Zap,
  Network,
  Terminal,
  ArrowRight,
  ChevronRight,
} from "lucide-react"

/* ---------- FadeIn ---------- */

function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
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
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------- Data ---------- */

const FEATURES = [
  {
    icon: Zap,
    title: "Smart Briefing",
    desc: "AI compiles precisely the context your agent needs. No manual searching, no token waste.",
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    desc: "AI discovers connections across your documents — contradictions, trends, and hidden patterns.",
  },
  {
    icon: Terminal,
    title: "Universal Connect",
    desc: "One line to connect any agent. MCP server, REST API, or CLI — your choice.",
  },
] as const

const STEPS = [
  { step: "01", title: "Upload your knowledge", desc: "Docs, notes, decisions — AI indexes everything automatically." },
  { step: "02", title: "AI builds the brief", desc: "Describe your task. Smart Briefing assembles the exact context." },
  { step: "03", title: "Agents work with full context", desc: "Connect via MCP, API, or CLI. Your agents never start from zero." },
] as const

/* ---------- Page ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-white">
            DriveMem
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/developers" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Docs
            </Link>
            <Link href="/signup" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-zinc-950 pt-14">
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(79, 91, 213, 0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-8xl">
              Memory for
              <br />
              your AI agents
            </h1>
          </FadeIn>
          <FadeIn>
            <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 sm:text-xl">
              Give every agent the knowledge it needs. Upload once, brief automatically, connect anywhere.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/developers"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Documentation
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#FAFAFA] py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Built for the AI-native workflow
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-zinc-500">
              Three capabilities that turn scattered documents into agent-ready intelligence.
            </p>
          </FadeIn>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <FadeIn key={f.title}>
                <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-zinc-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-200 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              How it works
            </h2>
          </FadeIn>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {STEPS.map((s) => (
              <FadeIn key={s.step}>
                <div>
                  <span className="text-sm font-mono font-medium text-brand-500">{s.step}</span>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Ready to give your agents memory?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
              Start free. Upload your first documents in minutes.
            </p>
            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Get started free
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <span className="text-sm text-zinc-500">&copy; {new Date().getFullYear()} DriveMem</span>
          <div className="flex gap-6">
            <Link href="/developers" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Developers</Link>
            <Link href="/signup" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Get Started</Link>
            <Link href="/privacy" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Privacy</Link>
            <Link href="/terms" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
