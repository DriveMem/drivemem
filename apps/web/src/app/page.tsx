"use client"

import Link from "next/link"
import { useRef, useEffect, useState, useCallback } from "react"

/* ============================================================
   DriveMem Landing v3 — Cinematic Dark, Constellation Hero
   ============================================================ */

/* ---------- Constellation Canvas ---------- */

interface Dot {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const animRef = useRef<number>(0)

  const initDots = useCallback((w: number, h: number) => {
    const count = Math.min(40, Math.floor((w * h) / 25000))
    const dots: Dot[] = []
    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 1,
      })
    }
    dotsRef.current = dots
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(dpr, dpr)
      initDots(rect.width, rect.height)
    }

    resize()
    window.addEventListener("resize", resize)

    const maxDist = 150

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      ctx.clearRect(0, 0, w, h)
      const dots = dotsRef.current

      // Update positions
      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0 || d.x > w) d.vx *= -1
        if (d.y < 0 || d.y > h) d.vy *= -1
      }

      // Draw lines
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = `rgba(94,106,210,${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Draw dots
      for (const d of dots) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(94,106,210,0.5)"
        ctx.fill()
        // glow
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r + 2, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(94,106,210,0.08)"
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [initDots])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.25 }}
      aria-hidden="true"
    />
  )
}

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
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------- Grain Overlay ---------- */

function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
      aria-hidden="true"
    />
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
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-[#050506]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[#5E6AD2] flex items-center justify-center">
            <span className="text-white font-mono text-xs font-bold">D</span>
          </div>
          <span className="text-[#EDEDEF] font-medium text-[15px] tracking-tight">
            DriveMem
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[#8A8F98] hover:text-[#EDEDEF] text-sm transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-[#8A8F98] hover:text-[#EDEDEF] text-sm transition-colors">
            How it works
          </a>
          <Link
            href="/login"
            className="text-sm text-[#050506] bg-[#EDEDEF] hover:bg-white px-4 py-1.5 rounded-md font-medium transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ---------- Features Data ---------- */

const FEATURES = [
  {
    title: "Persistent Memory",
    desc: "Your agents remember everything — across sessions, models, and tools. No more cold starts or lost context.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: "Smart Briefing",
    desc: "AI compiles precisely the context your agent needs. No manual searching, no token waste.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    title: "Knowledge Graph",
    desc: "AI discovers connections across your documents — contradictions, trends, and hidden patterns.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 6h8M6 8v8M18 8v8M8 18h8" />
      </svg>
    ),
  },
]

/* ---------- Steps Data ---------- */

const STEPS = [
  { num: "01", title: "Upload or capture", desc: "Drop files, save conversations, or let your agent write notes automatically." },
  { num: "02", title: "AI indexes & connects", desc: "DriveMem parses, summarizes, and discovers relationships across all your knowledge." },
  { num: "03", title: "Agents remember", desc: "Any agent, any model — instant access to the right context at the right time." },
]

/* ---------- Main Page ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050506] text-[#EDEDEF] selection:bg-[#5E6AD2]/30">
      <GrainOverlay />
      <Nav />

      {/* ===== Hero ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Constellation */}
        <ConstellationCanvas />

        {/* Ambient glows */}
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-[#5E6AD2] rounded-full blur-[150px] opacity-[0.07]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#5E6AD2] rounded-full blur-[120px] opacity-[0.04]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
              Memory for
              <br />
              <span className="italic text-[#5E6AD2]">your AI agents</span>
            </h1>
          </FadeIn>

          <FadeIn delay={150}>
            <p className="mt-6 md:mt-8 text-lg md:text-xl text-[#8A8F98] font-light max-w-xl mx-auto leading-relaxed">
              Give every agent persistent knowledge across sessions, models, and tools. 
              One knowledge base — seamless continuity.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-2.5 bg-[#EDEDEF] text-[#050506] rounded-md text-sm font-medium hover:bg-white transition-colors"
              >
                Start for free
              </Link>
              <a
                href="#features"
                className="px-6 py-2.5 rounded-md text-sm font-medium text-[#8A8F98] border border-white/[0.08] hover:border-white/[0.16] hover:text-[#EDEDEF] transition-all"
              >
                See how it works
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={450}>
            <div className="mt-10 md:mt-14 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[#8A8F98] text-xs font-mono">$</span>
              <code className="text-[13px] font-mono text-[#EDEDEF]/80">
                npm install @drivemem/sdk
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText("npm install @drivemem/sdk")}
                className="ml-2 text-[#8A8F98] hover:text-[#EDEDEF] transition-colors"
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

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050506] to-transparent" />
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="relative py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <p className="text-xs font-mono text-[#5E6AD2] tracking-widest uppercase mb-4">
              Features
            </p>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight mb-16 max-w-lg">
              Everything your agents need to remember
            </h2>
          </FadeIn>

          {/* Asymmetric grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left — tall card */}
            <FadeIn>
              <div className="group h-full rounded-xl bg-[#0a0a0c] border border-white/[0.06] hover:border-white/[0.12] p-8 md:p-10 transition-all duration-300 hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center text-[#5E6AD2] mb-6">
                  {FEATURES[0].icon}
                </div>
                <h3 className="font-serif text-xl md:text-2xl mb-3">{FEATURES[0].title}</h3>
                <p className="text-[#8A8F98] text-sm leading-relaxed font-light">
                  {FEATURES[0].desc}
                </p>
                <div className="mt-8 pt-6 border-t border-white/[0.04]">
                  <p className="text-xs text-[#8A8F98] font-light leading-relaxed">
                    Works with Claude, GPT, Gemini, open-source models, and any MCP-compatible agent framework.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Right — two stacked cards */}
            <div className="flex flex-col gap-4">
              {FEATURES.slice(1).map((f, i) => (
                <FadeIn key={f.title} delay={i * 100}>
                  <div className="group rounded-xl bg-[#0a0a0c] border border-white/[0.06] hover:border-white/[0.12] p-8 transition-all duration-300 hover:-translate-y-0.5">
                    <div className="w-10 h-10 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center text-[#5E6AD2] mb-5">
                      {f.icon}
                    </div>
                    <h3 className="font-serif text-xl mb-2">{f.title}</h3>
                    <p className="text-[#8A8F98] text-sm leading-relaxed font-light">
                      {f.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== How it Works ===== */}
      <section id="how-it-works" className="relative py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <FadeIn>
            <p className="text-xs font-mono text-[#5E6AD2] tracking-widest uppercase mb-4">
              How it works
            </p>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight mb-16 max-w-md">
              Three steps to agent memory
            </h2>
          </FadeIn>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[60px] right-[60px] h-px bg-gradient-to-r from-[#5E6AD2]/40 via-[#5E6AD2]/20 to-transparent" />

            <div className="grid md:grid-cols-3 gap-10 md:gap-8">
              {STEPS.map((step, i) => (
                <FadeIn key={step.num} delay={i * 120}>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-[#0a0a0c] border border-white/[0.06] flex items-center justify-center mb-5 relative z-10">
                      <span className="font-mono text-sm text-[#5E6AD2]">{step.num}</span>
                    </div>
                    <h3 className="font-serif text-lg mb-2">{step.title}</h3>
                    <p className="text-[#8A8F98] text-sm leading-relaxed font-light">
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
      <section className="relative py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {/* Glow behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#5E6AD2] rounded-full blur-[160px] opacity-[0.06]" />
          
          <FadeIn>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight mb-5 relative z-10">
              Start building with DriveMem
            </h2>
            <p className="text-[#8A8F98] text-base md:text-lg font-light mb-8 max-w-md mx-auto relative z-10">
              Free to start. No credit card required.
            </p>
            <Link
              href="/login"
              className="relative z-10 inline-flex px-8 py-3 bg-[#EDEDEF] text-[#050506] rounded-md text-sm font-medium hover:bg-white transition-colors"
              style={{ boxShadow: "0 0 40px rgba(94,106,210,0.2)" }}
            >
              Get started free
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-[#8A8F98]">
          <span>© {new Date().getFullYear()} DriveMem</span>
          <div className="flex gap-6">
            <a href="mailto:support@drivemem.cloud" className="hover:text-[#EDEDEF] transition-colors">Contact</a>
            <a href="https://github.com/yufuche1/ai-drive" className="hover:text-[#EDEDEF] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
