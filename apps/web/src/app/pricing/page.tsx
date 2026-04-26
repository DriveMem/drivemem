import Link from "next/link"
import { FaqSection } from "./faq"

export const metadata = {
  title: "Pricing — DriveMem",
  description:
    "DriveMem pricing. Start free with 50 files, AI chat, unlimited MCP agents, and full API access. No credit card required.",
}

const features = [
  "50 files",
  "AI Chat with RAG",
  "Unlimited MCP agents",
  "Full API access",
  "Desktop app (all platforms)",
  "Google Drive connector",
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-mono text-xs font-bold">D</span>
            </div>
            <span className="text-gray-900 dark:text-white font-semibold tracking-tight">
              DriveMem
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">Home</Link>
            <Link href="/developers" className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">Docs</Link>
            <Link href="/download" className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">Download</Link>
            <Link
              href="/signup"
              className="text-sm text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Try it free
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Start free. No credit card required.
          </p>
        </div>

        {/* Free Plan Card */}
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Free</h2>
            <p className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-white">
              $0
              <span className="text-base font-normal text-gray-500 dark:text-gray-400"> / month</span>
            </p>
          </div>
          <ul className="space-y-3 mb-8">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <svg className="w-5 h-5 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="block w-full text-center text-white bg-brand-500 hover:bg-brand-600 px-6 py-3 rounded-xl font-semibold text-base transition-colors"
          >
            Get started free
          </Link>
        </div>

        {/* Coming Soon */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 font-medium">
            Pro Plan — Coming soon
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-600">
            More storage, team features, and priority support.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently asked questions
          </h2>
          <FaqSection />
        </div>
      </main>
    </div>
  )
}
