"use client"

import Link from "next/link"
import { useRef, useEffect, useState } from "react"

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
  const [visible, setVisible] = useState(false)
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
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white font-mono text-xs font-bold">D</span>
          </div>
          <span className="text-gray-900 font-semibold text-[15px] tracking-tight">
            DriveMem
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            How it works
          </a>
          <Link href="/developers" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Docs
          </Link>
          <Link href="/login" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
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
    title: "Gets smarter over time",
    desc: "DriveMem discovers connections, detects conflicts, and learns what matters to you.",
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
    desc: "DriveMem captures valuable knowledge automatically. No manual saving.",
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
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08]">
              One memory.
              <br />
              <span className="text-brand-500">Every agent.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={100}>
            <p className="mt-6 md:mt-8 text-lg md:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
              Your AI tools forget everything between sessions. DriveMem gives them a shared brain — so they remember what matters.
            </p>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-sm hover:shadow-brand-md"
              >
                Get started free
              </Link>
              <a
                href="#how-it-works"
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                See how it works
              </a>
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

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 100}>
                <div className="group rounded-2xl bg-white border border-gray-100 p-8 transition-all duration-300 hover:-translate-y-1 shadow-soft hover:shadow-soft-md">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 mb-6">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it Works ===== */}
      <section id="how-it-works" className="py-24 md:py-32 bg-[#FAFAFA]">
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
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
            <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
              Start free — no credit card required
            </p>
            <Link
              href="/login"
              className="inline-flex px-8 py-3 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-md hover:shadow-brand-lg"
            >
              Get started free
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} DriveMem</span>
          <div className="flex gap-6">
            <Link href="/developers" className="hover:text-gray-600 transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <a href="https://github.com/yufuche1/ai-drive" className="hover:text-gray-600 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
