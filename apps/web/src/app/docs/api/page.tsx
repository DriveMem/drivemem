import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "API Reference — DriveMem Docs",
  description: "DriveMem API Reference documentation.",
}

export default function ApiReferencePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <div className="text-center py-20">
        <div className="text-5xl mb-6">📚</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">API Reference</h1>
        <p className="text-gray-500 text-lg mb-6">Coming Soon</p>
        <p className="text-gray-400 text-sm mb-8">
          In the meantime, check out the{" "}
          <Link href="/docs/mcp" className="text-brand-500 hover:text-brand-600 underline underline-offset-2">
            MCP Integration guide
          </Link>{" "}
          to get started.
        </p>
      </div>
    </div>
  )
}
