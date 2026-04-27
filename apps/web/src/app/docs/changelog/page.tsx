import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Changelog — DriveMem",
  description:
    "See what's new in DriveMem — the AI-native knowledge layer for coding agents. Latest releases, improvements, and bug fixes.",
  openGraph: {
    title: "Changelog — DriveMem",
    description: "See what's new in DriveMem. Latest releases, improvements, and bug fixes.",
  },
}

/* ── badge colors ── */
const badge = {
  New: "bg-emerald-100 text-emerald-700",
  Improved: "bg-blue-100 text-blue-700",
  Fixed: "bg-amber-100 text-amber-700",
} as const

type Tag = keyof typeof badge

interface Entry {
  version: string
  date: string
  title: string
  items: { tag: Tag; text: string }[]
}

const changelog: Entry[] = [
  {
    version: "v0.2.4",
    date: "April 27, 2026",
    title: "Claude Code Hooks & Full Documentation",
    items: [
      { tag: "New", text: "Claude Code Hooks auto-capture — automatically save decisions, architecture notes, and key outputs to DriveMem" },
      { tag: "New", text: "Full documentation site: API Reference, MCP Integration, Core Concepts, Claude Code Hooks guides" },
      { tag: "New", text: "Changelog page with release history" },
      { tag: "Improved", text: "Docs sidebar navigation with mobile responsive menu" },
    ],
  },
  {
    version: "v0.2.3",
    date: "April 26, 2026",
    title: "Pricing, Registration & Data Consistency",
    items: [
      { tag: "New", text: "Pricing page with Free / Pro / Team tiers" },
      { tag: "Improved", text: "Registration flow with value proposition highlights" },
      { tag: "Improved", text: "Cross-page data consistency — knowledge counts, activity feeds, and insights stay in sync" },
      { tag: "Fixed", text: "Landing page CTA buttons properly link to signup" },
      { tag: "Fixed", text: "Notification language unified to English" },
    ],
  },
  {
    version: "v0.2.2",
    date: "April 25, 2026",
    title: "Desktop App & Onboarding",
    items: [
      { tag: "New", text: "Desktop app v0.1.0 for macOS, Windows, and Linux" },
      { tag: "New", text: "Download page with automatic OS detection" },
      { tag: "New", text: "Welcome modal onboarding flow (2-step)" },
      { tag: "New", text: "Dashboard empty state with action cards" },
      { tag: "New", text: "Knowledge Activity Push notifications (file indexed, sync, stale alerts)" },
      { tag: "Improved", text: "Deploy script: build-once-rsync for multi-VPS consistency" },
    ],
  },
  {
    version: "v0.2.1",
    date: "April 24, 2026",
    title: "DriveMem Proxy & AI Model Profiles",
    items: [
      { tag: "New", text: "DriveMem Proxy PRD — 43 model profiles with automatic knowledge injection" },
      { tag: "New", text: "Anthropic API support (Claude models via proxy)" },
      { tag: "Improved", text: "Summary visual hierarchy improvement" },
      { tag: "Improved", text: "Agent Activity dynamic filter tabs" },
      { tag: "Fixed", text: "React hydration error #418" },
      { tag: "Fixed", text: "Notification mark-all-read fix (Fastify 5 compat)" },
    ],
  },
  {
    version: "v0.2.0",
    date: "April 23, 2026",
    title: "MCP Stdio Bridge & Docs Framework",
    items: [
      { tag: "New", text: "MCP stdio bridge — connect any stdio-based tool to DriveMem" },
      { tag: "New", text: "Documentation framework with sidebar navigation" },
      { tag: "New", text: "Quick Start guide for new users" },
      { tag: "Improved", text: "MCP SSE reconnection with session preservation" },
    ],
  },
  {
    version: "v0.1.2",
    date: "April 22, 2026",
    title: "Analytics, Navigation & Downloads",
    items: [
      { tag: "New", text: "User analytics dashboard — file counts, query volume, agent activity" },
      { tag: "New", text: "Landing page navigation bar" },
      { tag: "New", text: "Download page for desktop clients" },
      { tag: "Improved", text: "Activity feed collapse (2-min window grouping)" },
      { tag: "Improved", text: "Tags panel collapse & search (Show top 10 + expand)" },
      { tag: "Fixed", text: "Agent name display fix (displayAgentName regex)" },
      { tag: "Fixed", text: "Time format unified across components" },
    ],
  },
  {
    version: "v0.1.0",
    date: "April 2026",
    title: "Initial Release",
    items: [
      { tag: "New", text: "Knowledge base with semantic search (aidrive_search)" },
      { tag: "New", text: "RAG-powered Q&A (aidrive_ask)" },
      { tag: "New", text: "MCP server for Cursor, Claude Desktop, Windsurf, and more" },
      { tag: "New", text: "File upload and management with project-scoped organization" },
      { tag: "New", text: "REST API with API key authentication" },
      { tag: "New", text: "Chat with your knowledge — conversational interface" },
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Changelog</h1>
      <p className="text-gray-500 mb-10 text-sm">
        New features, improvements, and fixes shipping in DriveMem.
      </p>

      {/* timeline */}
      <div className="border-l-2 border-brand-200 pl-6 space-y-12">
        {changelog.map((entry) => (
          <article key={entry.version} className="relative">
            {/* dot */}
            <span className="absolute -left-[calc(1.5rem+5px)] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-white" />

            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="bg-brand-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {entry.version}
              </span>
              <time className="text-sm text-gray-400">{entry.date}</time>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-3">{entry.title}</h2>

            <ul className="space-y-2">
              {entry.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span
                    className={`shrink-0 mt-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${badge[item.tag]}`}
                  >
                    {item.tag}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-16 text-gray-400 text-sm text-center">
        Follow us on{" "}
        <a
          href="https://github.com/yufuche1/ai-drive"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-500 hover:underline"
        >
          GitHub
        </a>{" "}
        for the latest updates.
      </p>
    </div>
  )
}
