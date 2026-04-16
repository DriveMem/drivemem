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
          <Link
            href="/login"
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
    <div className="relative mx-auto max-w-4xl px-6" style={{ perspective: "1200px" }}>
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
        {/* Fake dashboard UI */}
        <div className="bg-white p-6 space-y-4">
          <div className="flex gap-4">
            {/* Fake sidebar */}
            <div className="w-48 space-y-2 hidden sm:block">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-8 w-full bg-brand-50 rounded-lg border border-brand-100/50" />
              <div className="h-8 w-full bg-gray-50 rounded-lg" />
              <div className="h-8 w-full bg-gray-50 rounded-lg" />
              <div className="h-8 w-full bg-gray-50 rounded-lg" />
            </div>
            {/* Fake content */}
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-20 bg-brand-50/50 rounded-xl border border-brand-100/30" />
                <div className="h-20 bg-gray-50 rounded-xl" />
                <div className="h-20 bg-gray-50 rounded-xl" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-4/5 bg-gray-100 rounded" />
                <div className="h-3 w-3/5 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Features Data ---------- */

const FEATURES = [
  {
    title: "Your agents remember everything",
    desc: "Knowledge is captured automatically across sessions, models, and tools. No more cold starts or lost context.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: "Connect any AI tool",
    desc: "One line of code to plug in. Works with Claude, GPT, Gemini, and any MCP-compatible agent.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: "Knowledge flows between agents",
    desc: "Information discovered by one agent is instantly available to all others. Cross-agent continuity, automatically.",
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
    title: "Upload or capture",
    desc: "Drop files, save conversations, or let your agent write notes automatically.",
  },
  {
    num: "2",
    title: "AI indexes & connects",
    desc: "DriveMem parses, summarizes, and discovers relationships across all your knowledge.",
  },
  {
    num: "3",
    title: "Agents remember",
    desc: "Any agent, any model — instant access to the right context at the right time.",
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
              Give every AI agent
              <br />
              <span className="text-brand-500">the memory it needs</span>
            </h1>
          </FadeIn>

          <FadeIn delay={100}>
            <p className="mt-6 md:mt-8 text-lg md:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
              One knowledge base that gives your agents persistent memory across sessions, models, and tools.
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

          <FadeIn delay={300}>
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-gray-400 text-xs font-mono">$</span>
              <code className="text-[13px] font-mono text-gray-700">
                npm install @drivemem/sdk
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText("npm install @drivemem/sdk")}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
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

      {/* ===== Product Preview ===== */}
      <section className="relative py-20 px-6">
        <FadeIn>
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {/* 产品界面预览 - 用 CSS 模拟 Dashboard */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 aspect-[16/10] relative">
                {/* 模拟顶部导航 */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-zinc-500">drive.verrrnm.cloud</span>
                  </div>
                </div>
                {/* 模拟侧边栏 + 主内容 */}
                <div className="flex h-full">
                  <div className="w-48 border-r border-white/5 p-4 space-y-3">
                    <div className="h-3 bg-white/10 rounded w-20" />
                    <div className="h-3 bg-white/5 rounded w-24" />
                    <div className="h-3 bg-white/5 rounded w-16" />
                    <div className="h-3 bg-white/5 rounded w-28" />
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                    <div className="h-4 bg-white/10 rounded w-40" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <div className="h-3 bg-indigo-400/20 rounded w-16" />
                        <div className="h-8 bg-white/5 rounded" />
                        <div className="h-2 bg-white/5 rounded w-20" />
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <div className="h-3 bg-emerald-400/20 rounded w-20" />
                        <div className="h-8 bg-white/5 rounded" />
                        <div className="h-2 bg-white/5 rounded w-16" />
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <div className="h-3 bg-amber-400/20 rounded w-14" />
                        <div className="h-8 bg-white/5 rounded" />
                        <div className="h-2 bg-white/5 rounded w-24" />
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-32" />
                      <div className="h-2 bg-white/5 rounded w-full" />
                      <div className="h-2 bg-white/5 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              </div>
              {/* 光晕效果 */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent pointer-events-none" />
            </div>
            <p className="text-center mt-6 text-zinc-400 text-sm">
              Your knowledge, structured and ready for any AI agent
            </p>
          </div>
        </FadeIn>
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
              Start building with DriveMem
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
              Free to start. No credit card required.
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
