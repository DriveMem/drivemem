"use client"

import Link from "next/link"
import { useRef, useEffect, useState } from "react"
import { trackEvent } from "@/lib/analytics"

/* ============================================================
   DriveMem Landing — Light, Clean, Notion-inspired
   ============================================================ */

/* ---------- FadeIn ---------- */

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          obs.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------- Nav ---------- */

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled || mobileMenuOpen
          ? "bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white font-mono text-xs font-bold">D</span>
          </div>
          <span className="text-gray-900 font-semibold text-title tracking-tight">
            DriveMem
          </span>
        </Link>
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-3">
          <a href="https://github.com/DriveMem/drivemem" target="_blank" rel="noopener" className="text-gray-400 hover:text-gray-900 transition-colors" aria-label="GitHub">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <Link href="/login" className="text-gray-500 hover:text-gray-900 text-sm">Sign in</Link>
          <Link href="/signup" className="text-sm text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg font-medium transition-colors">Start free</Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Features
          </a>
          <Link href="/docs/quickstart" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Docs
          </Link>
          <Link href="/pricing" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Pricing
          </Link>
          <Link href="/download" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Download
          </Link>
          <Link href="/login" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Sign in
          </Link>
          <a
            href="https://github.com/DriveMem/drivemem"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <Link
            href="/signup"
            onClick={() => trackEvent("signup_click", { source: "nav" })}
            className="text-sm text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try it free
          </Link>
        </div>
      </div>
      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200/60 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-900 text-sm py-2 transition-colors">Features</a>
            <Link href="/docs/quickstart" onClick={() => setMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-900 text-sm py-2 transition-colors">Docs</Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-900 text-sm py-2 transition-colors">Pricing</Link>
            <Link href="/download" onClick={() => setMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-900 text-sm py-2 transition-colors">Download</Link>
            <hr className="border-gray-100" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-900 text-sm py-2 transition-colors">Sign in</Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white bg-brand-500 hover:bg-brand-600 px-4 py-2.5 rounded-lg font-medium transition-colors text-center">Try it free</Link>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ---------- Product Preview Mockup ---------- */

function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-5xl px-6" style={{ perspective: "1200px" }}>
      <div
        className="rounded-2xl shadow-soft-lg border border-gray-200/50 overflow-hidden"
        style={{ transform: "rotateX(2deg)" }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-gray-400 font-mono">drivemem.cloud</span>
        </div>
        {/* Real product screenshot */}
        <img
          src="/screenshots/dashboard.png"
          alt="DriveMem Dashboard — manage your AI knowledge base"
          className="w-full block"
          loading="lazy"
        />
      </div>
    </div>
  )
}

/* ---------- Features Data ---------- */

const FEATURES = [
  {
    title: "Agents remember everything",
    desc: "Every decision, every insight, every preference — captured automatically from your conversations.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: "Knowledge flows between agents",
    desc: "What Claude learns, Cursor knows. Switch tools without repeating yourself.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: "Organized automatically",
    desc: "DriveMem tags, links, and structures your knowledge as it grows — so agents find what they need without you organizing anything.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    title: "Automatic knowledge capture",
    desc: "Claude Code sessions are captured automatically via Hooks — no manual saving needed. Your coding context flows into your knowledge base.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6l3-3" />
        <path d="M12 8l-3-3" />
        <circle cx="12" cy="18" r="4" />
        <path d="M12 14v-2" />
      </svg>
    ),
  },
  {
    title: "Gets smarter over time",
    desc: "Your knowledge base learns from every interaction — better search, better answers, better suggestions.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    bullets: [
      "Search improves as you use it — query patterns refine ranking",
      "AI answers get more accurate with citation feedback",
      "Knowledge gaps auto-detected and flagged",
    ],
  },
]

/* ---------- Steps Data ---------- */

const STEPS = [
  {
    num: "1",
    title: "Connect your agents",
    desc: "One URL. Works with Cursor, Claude, ChatGPT, and any MCP-compatible tool.",
  },
  {
    num: "2",
    title: "Just work normally",
    desc: "MCP syncs knowledge in real time. Claude Code Hooks capture session insights automatically. No manual saving.",
  },
  {
    num: "3",
    title: "Every agent has full context",
    desc: "Your next conversation starts where the last one left off.",
  },
]

/* ---------- Main Page ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-brand-100">
      <Nav />

      {/* ===== Hero ===== */}
      <section
        className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #F0F2FF 100%)",
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                100% Open Source
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08]">
              One memory.
              <br />
              <span className="text-brand-500">Every agent.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={100}>
            <p className="mt-6 md:mt-8 text-body md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Your AI knowledge base that gets smarter the more you use it
            </p>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="flex items-center justify-center gap-3 mt-4">
              <a href="https://github.com/DriveMem/drivemem" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Open Source
              </a>
              <img src="https://img.shields.io/github/stars/DriveMem/drivemem?style=social" alt="GitHub Stars" className="h-5" />
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            {/* Trust indicators */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
          <a href="https://github.com/DriveMem/drivemem" target="_blank" rel="noopener" className="flex items-center gap-1.5 hover:text-gray-600 transition-colors font-medium">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Star us on GitHub →
          </a>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Your data stays yours
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            5 min setup
          </span>
        </div>

        <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                onClick={() => trackEvent("signup_click", { source: "hero" })}
                className="px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-sm hover:shadow-brand-md"
              >
                Try It Free →
              </Link>
              <Link
                href="/download"
                onClick={() => trackEvent("desktop_download", { source: "hero" })}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Desktop
              </Link>

            </div>
          </FadeIn>

        </div>

        {/* Product Preview */}
        <div className="mt-16 md:mt-20">
          <FadeIn delay={400}>
            <ProductPreview />
          </FadeIn>
        </div>
      </section>

      {/* ===== Social Proof Strip ===== */}
      <section className="py-12 md:py-16 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14">
              {/* GitHub Stars */}
              <a
                href="https://github.com/DriveMem/drivemem"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <img
                  src="https://img.shields.io/github/stars/DriveMem/drivemem?style=flat&logo=github&label=Stars"
                  alt="GitHub Stars"
                  className="h-5"
                  loading="lazy"
                />
              </a>

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-gray-200" />

              {/* Dynamic count */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-lg font-bold text-gray-900">1,000+</span>
                <span>files processed</span>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-gray-200" />

              {/* Quotes */}
              <div className="flex flex-col sm:flex-row gap-6">
                <blockquote className="text-sm text-gray-500 italic max-w-xs">
                  &ldquo;The missing memory layer for my AI workflow&rdquo;
                  <span className="not-italic text-xs text-gray-400 ml-1.5">— Early Adopter</span>
                </blockquote>
                <blockquote className="text-sm text-gray-500 italic max-w-xs">
                  &ldquo;One place for all my AI knowledge&rdquo;
                  <span className="not-italic text-xs text-gray-400 ml-1.5">— Developer</span>
                </blockquote>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="py-24 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-medium text-brand-500 mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                Everything your agents need
              </h2>
            </div>
          </FadeIn>

          {/* Row 1: 2 large feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {FEATURES.slice(0, 2).map((f, i) => (
              <FadeIn key={f.title} delay={i * 100}>
                <div className="group rounded-2xl bg-white border border-gray-100 p-8 transition-all duration-300 hover:-translate-y-1 shadow-soft hover:shadow-soft-md h-full">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 mb-6">
                    {f.icon}
                  </div>
                  <h3 className="text-title font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-body leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Row 2: 3 regular feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.slice(2).map((f, i) => (
              <FadeIn key={f.title} delay={(i + 2) * 100}>
                <div className="group rounded-2xl bg-white border border-gray-100 p-8 transition-all duration-300 hover:-translate-y-1 shadow-soft hover:shadow-soft-md h-full">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 mb-6">
                    {f.icon}
                  </div>
                  <h3 className="text-title font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-body leading-relaxed">{f.desc}</p>
                  {f.bullets && (
                    <ul className="mt-4 space-y-2">
                      {f.bullets.map((b: string) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Use Cases ===== */}
      <section id="use-cases" className="py-24 md:py-32 bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-medium text-brand-500 mb-3">Use Cases</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                Built for real workflows
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                See how teams use DriveMem
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — AI Agent Memory */}
            <FadeIn delay={0}>
              <div className="bg-white rounded-2xl shadow-soft p-8 h-full flex flex-col">
                <div className="text-3xl mb-4">🤖</div>
                <h3 className="text-title font-semibold text-gray-900 mb-2">Code review that knows your codebase</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Your coding agent remembers architecture decisions, past reviews, and team conventions across every PR.
                </p>
                <div className="rounded-xl bg-gray-50 p-5 mb-6 space-y-4 flex-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Before</p>
                    <p className="text-sm text-gray-400 line-through leading-relaxed">
                      Re-explain architecture and conventions in every review.
                    </p>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-1.5">After</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Your agent already knows the codebase — reviews are faster and more consistent.
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Link href="/signup" className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                    Connect your first agent →
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Card 2 — Personal Knowledge Base */}
            <FadeIn delay={100}>
              <div className="bg-white rounded-2xl shadow-soft p-8 h-full flex flex-col">
                <div className="text-3xl mb-4">🧠</div>
                <h3 className="text-title font-semibold text-gray-900 mb-2">Ask your documents anything</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Drop in specs, meeting notes, research — then query them from any AI tool. No re-uploading.
                </p>
                <div className="rounded-xl bg-gray-50 p-5 mb-6 space-y-4 flex-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Before</p>
                    <p className="text-sm text-gray-400 line-through leading-relaxed">
                      Manual search through dozens of files. Copy-paste relevant sections into AI chats.
                    </p>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-1.5">After</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      One question gets precise answers from all your files, with source citations.
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Link href="/signup" className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                    Start organizing →
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Card 3 — Cross-Agent Workflow */}
            <FadeIn delay={200}>
              <div className="relative bg-white rounded-2xl shadow-soft p-8 h-full flex flex-col">
                <div className="text-3xl mb-4">🔄</div>
                <h3 className="text-title font-semibold text-gray-900 mb-2">Hand off context, not copy-paste</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  One agent researches, another writes, a third reviews — all sharing the same memory. No manual bridging.
                </p>
                <div className="rounded-xl bg-gray-50 p-5 mb-6 space-y-4 flex-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Before</p>
                    <p className="text-sm text-gray-400 line-through leading-relaxed">
                      Manually relay information between different AI tools.
                    </p>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-1.5">After</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      What one agent learns, every agent knows. Seamless handoff between tools.
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  <a href="#how-it-works" className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                    See how it works →
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== How it Works ===== */}
      <section id="how-it-works" className="py-24 md:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-medium text-brand-500 mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                Three steps to agent memory
              </h2>
            </div>
          </FadeIn>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-gray-200" />

            <div className="grid md:grid-cols-3 gap-12 md:gap-8">
              {STEPS.map((step, i) => (
                <FadeIn key={step.num} delay={i * 120}>
                  <div className="relative text-center">
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                      <span className="text-2xl font-bold text-brand-500">{step.num}</span>
                    </div>
                    <h3 className="text-title font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-body leading-relaxed max-w-xs mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Social Proof / Testimonials ===== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-brand-500 mb-3">Trusted by early adopters</p>
              <div className="flex items-center justify-center gap-10 md:gap-16 mb-12">
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-gray-900">1,000+</p>
                  <p className="text-sm text-gray-500 mt-1">Files organized</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-gray-900">500+</p>
                  <p className="text-sm text-gray-500 mt-1">Agent sessions powered</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-gray-900">50+</p>
                  <p className="text-sm text-gray-500 mt-1">Early users</p>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            <FadeIn delay={0}>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  &ldquo;DriveMem is the missing piece for my AI workflow. Now Claude remembers my project context across every session.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">A</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Alex</p>
                    <p className="text-xs text-gray-400">Full-stack Developer</p>
                  </div>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  &ldquo;I use Cursor and Claude Code together. DriveMem lets them share knowledge seamlessly — it just works.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">S</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sarah</p>
                    <p className="text-xs text-gray-400">AI Researcher</p>
                  </div>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  &ldquo;Finally, my agents don&apos;t start from scratch every time. The automatic capture from Claude Code Hooks is brilliant.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">M</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Marcus</p>
                    <p className="text-xs text-gray-400">Engineering Lead</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section
        className="py-24 md:py-32"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #F0F2FF 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-5">
              Ready to give your agents memory?
            </h2>
            <p className="text-gray-500 text-body mb-8 max-w-md mx-auto">
              Start free — no credit card required
            </p>
            <Link
              href="/signup"
              onClick={() => trackEvent("signup_click", { source: "bottom_cta" })}
              className="inline-flex px-8 py-3 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-md hover:shadow-brand-lg"
            >
              Try it free
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} DriveMem</span>
          <div className="flex gap-6">
            <Link href="/docs/quickstart" className="hover:text-gray-600 transition-colors">Quick Start</Link>
            <Link href="/docs" className="hover:text-gray-600 transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-gray-600 transition-colors">Pricing</Link>
            <Link href="/changelog" className="hover:text-gray-600 transition-colors">Changelog</Link>
            <Link href="/download" className="hover:text-gray-600 transition-colors">Download</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <a href="https://github.com/DriveMem/drivemem/blob/main/CONTRIBUTING.md" className="hover:text-gray-600 transition-colors">Contributing</a>
            <a href="https://github.com/DriveMem/drivemem" className="hover:text-gray-600 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
