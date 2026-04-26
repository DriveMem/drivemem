import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Changelog — DriveMem Docs",
  description: "DriveMem release changelog.",
}

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Changelog</h1>

      <div className="border-l-2 border-brand-200 pl-6 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-brand-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              v0.1.3
            </span>
            <span className="text-sm text-gray-400">April 26, 2026</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Developer Documentation &amp; Polish</h2>
          <ul className="space-y-1.5 text-gray-600 text-sm">
            <li>• MCP Integration documentation (/docs/mcp)</li>
            <li>• REST API reference documentation (/docs/api)</li>
            <li>• Docs navigation framework with sidebar</li>
            <li>• Knowledge Activity Push notifications (file indexed, sync, stale alerts)</li>
            <li>• File summary AI meta-language cleanup</li>
            <li>• Tags panel collapse &amp; search (Show top 10 + expand)</li>
            <li>• Suggested questions follow user language</li>
            <li>• Landing page copy optimization</li>
            <li>• CTA buttons properly link to signup</li>
            <li>• Notification language unified to English</li>
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-brand-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              v0.1.2
            </span>
            <span className="text-sm text-gray-400">April 25, 2026</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Desktop Release &amp; Onboarding</h2>
          <ul className="space-y-1.5 text-gray-600 text-sm">
            <li>• Desktop app v0.1.0 released for macOS, Windows, Linux</li>
            <li>• GitHub Release published with 3-platform downloads</li>
            <li>• Download page with OS auto-detection</li>
            <li>• Dynamic version check from GitHub Releases API</li>
            <li>• Welcome Modal onboarding flow (2-step)</li>
            <li>• Dashboard empty state with action cards</li>
            <li>• First upload tooltip</li>
            <li>• Desktop version update notification API</li>
            <li>• Deploy script: build-once-rsync for multi-VPS consistency</li>
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-brand-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              v0.1.1
            </span>
            <span className="text-sm text-gray-400">April 24, 2026</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Stability &amp; UX</h2>
          <ul className="space-y-1.5 text-gray-600 text-sm">
            <li>• MCP SSE reconnection with session preservation</li>
            <li>• React hydration error #418 fixed</li>
            <li>• Activity feed collapse (2-min window grouping)</li>
            <li>• Summary visual hierarchy improvement</li>
            <li>• Outdated files threshold → 7 days + Refresh All</li>
            <li>• Agent Activity dynamic filter tabs</li>
            <li>• Agent name display fix (displayAgentName regex)</li>
            <li>• Notification mark-all-read fix (Fastify 5 compat)</li>
            <li>• Time format unified across components</li>
            <li>• Agent icon differentiation (color-coded avatars)</li>
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-brand-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              v0.1.0
            </span>
            <span className="text-sm text-gray-400">April 2026</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Initial Release</h2>
          <ul className="space-y-1.5 text-gray-600 text-sm">
            <li>• Knowledge base with semantic search</li>
            <li>• RAG-powered Q&A (aidrive_ask)</li>
            <li>• MCP server for Cursor, Claude Desktop, Windsurf</li>
            <li>• File upload and management</li>
            <li>• Project-scoped organization</li>
            <li>• REST API with API key authentication</li>
          </ul>
        </div>
      </div>

      <p className="mt-12 text-gray-400 text-sm text-center">
        Subscribe for updates → follow us on GitHub.
      </p>
    </div>
  )
}
