import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Pricing - DriveMem",
  description:
    "DriveMem is free to use. No credit card required. See what's included in the Free plan.",
}

/* ─── Plan features ─── */
const FEATURES = [
  { label: "Storage", value: "50 files", included: true },
  { label: "AI Chat", value: "Included", included: true },
  { label: "MCP Integration", value: "Unlimited agents", included: true },
  { label: "API Access", value: "Full API", included: true },
  { label: "Desktop App", value: "All platforms", included: true },
  { label: "Claude Code Hooks", value: "Auto-capture", included: true },
  { label: "Connectors", value: "Google Drive (more coming)", included: true },
]

/* ─── FAQ ─── */
const FAQ = [
  {
    q: "Is DriveMem really free?",
    a: "Yes. The current plan is completely free with no hidden costs. No credit card required to sign up.",
  },
  {
    q: "Will my data be safe?",
    a: "Your files are encrypted at rest and in transit. We never use your data to train models.",
  },
  {
    q: "What happens when Pro launches?",
    a: "Your Free plan stays exactly the same. Pro will add more storage, team features, and priority support on top.",
  },
]

function Check() {
  return (
    <svg
      className="w-5 h-5 text-brand-500 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-brand-100">
      {/* ── Header ── */}
      <section
        className="pt-32 pb-16 md:pt-40 md:pb-20 text-center"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #F0F2FF 100%)",
        }}
      >
        <p className="text-sm font-medium text-brand-500 mb-3">Pricing</p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-md mx-auto">
          Start free. No credit card required.
        </p>
      </section>

      {/* ── Plan Card ── */}
      <section className="pb-20 md:pb-28 -mt-2">
        <div className="max-w-md mx-auto px-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-soft-lg p-8 md:p-10">
            <p className="text-sm font-medium text-brand-500 uppercase tracking-wider mb-1">
              Free
            </p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold text-gray-900">$0</span>
              <span className="text-gray-400 text-lg">/ month</span>
            </div>

            <ul className="space-y-4 mb-8">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <Check />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">{f.label}</span>{" "}
                    <span className="text-gray-500">— {f.value}</span>
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="block w-full text-center px-6 py-3 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-sm hover:shadow-brand-md"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Coming Soon ── */}
      <section className="py-16 md:py-20 bg-[#FAFAFA]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-600 mb-4">
            Coming soon
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-3">
            Pro Plan
          </h2>
          <div className="flex items-baseline justify-center gap-1 mb-3">
            <span className="text-4xl font-bold text-gray-900">$9.9</span>
            <span className="text-gray-400 text-lg">/ month</span>
          </div>
          <p className="text-sm text-brand-500 font-medium mb-3">Starting at $9.9/mo when available</p>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            More storage, team features, and priority support.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-10 text-center">
            Frequently asked questions
          </h2>
          <div className="divide-y divide-gray-100">
            {FAQ.map((item) => (
              <div key={item.q} className="py-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {item.q}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section
        className="py-20 md:py-24"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #F0F2FF 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Ready to give your agents memory?
          </h2>
          <p className="text-gray-500 mb-8">
            Start free — no credit card required
          </p>
          <Link
            href="/signup"
            className="inline-flex px-8 py-3 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-md hover:shadow-brand-lg"
          >
            Get started free →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} DriveMem</span>
          <div className="flex gap-6">
            <Link href="/docs/quickstart" className="hover:text-gray-600 transition-colors">Quick Start</Link>
            <Link href="/docs" className="hover:text-gray-600 transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-gray-600 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <a href="https://github.com/yufuche1/ai-drive" className="hover:text-gray-600 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
