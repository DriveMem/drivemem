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
        Full changelog coming soon.
      </p>
    </div>
  )
}
