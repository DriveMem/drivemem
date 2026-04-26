import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MCP Integration — DriveMem Docs",
  description: "Connect DriveMem to Cursor, Claude Desktop, Windsurf and any MCP-compatible AI tool.",
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <pre className="rounded-xl bg-gray-950 border border-gray-800/60 p-5 overflow-x-auto text-sm leading-relaxed">
      <code className={`language-${lang} text-gray-300`}>{code}</code>
    </pre>
  )
}

export default function McpPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          MCP INTEGRATION
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
          DriveMem MCP Integration
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          Give your AI tools persistent memory through the Model Context Protocol.
        </p>
      </div>

      <div className="space-y-10">
        {/* What is MCP */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">What is MCP?</h2>
          <p className="text-gray-600 leading-relaxed">
            Model Context Protocol (MCP) lets AI tools access external data sources.
            DriveMem provides an MCP server that gives your AI tools access to your
            knowledge base — search, ask questions, store decisions, and more.
          </p>
        </section>

        {/* Supported Clients */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Supported Clients</h2>
          <ul className="space-y-2 text-gray-600">
            {[
              ["Cursor", "native MCP support"],
              ["Claude Desktop", "via stdio bridge"],
              ["Windsurf", "native MCP support"],
              ["Any MCP-compatible client", ""],
            ].map(([name, note]) => (
              <li key={name} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                <span className="font-medium text-gray-900">{name}</span>
                {note && <span className="text-gray-400 text-sm">— {note}</span>}
              </li>
            ))}
          </ul>
        </section>

        {/* Quick Setup */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Quick Setup</h2>
          <p className="text-gray-600 mb-3">
            Auto-configure Cursor, Claude Desktop, and Windsurf in one command:
          </p>
          <CodeBlock code="npx drivemem setup --api-key=YOUR_KEY" />
        </section>

        {/* Manual Setup — Cursor */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Manual Setup — Cursor</h2>
          <p className="text-gray-600 mb-3">
            Add to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-brand-600">~/.cursor/mcp.json</code>:
          </p>
          <CodeBlock
            lang="json"
            code={`{
  "mcpServers": {
    "drivemem": {
      "url": "https://api.drivemem.cloud/mcp?apiKey=YOUR_KEY"
    }
  }
}`}
          />
        </section>

        {/* Manual Setup — Claude Desktop */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Manual Setup — Claude Desktop</h2>
          <p className="text-gray-600 mb-3">
            Add to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-brand-600">claude_desktop_config.json</code>:
          </p>
          <CodeBlock
            lang="json"
            code={`{
  "mcpServers": {
    "drivemem": {
      "command": "npx",
      "args": ["-y", "drivemem@latest", "mcp", "--api-key=YOUR_KEY"]
    }
  }
}`}
          />
        </section>

        {/* Available Tools */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Available Tools</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Tool</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["aidrive_search", "Semantic search across your knowledge base"],
                  ["aidrive_ask", "RAG Q&A with source citations"],
                  ["aidrive_store", "Save knowledge (decisions, notes, code)"],
                  ["aidrive_harvest", "Extract conclusions from conversations"],
                  ["aidrive_get_context", "Load full project context"],
                ].map(([tool, desc]) => (
                  <tr key={tool} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-brand-600 font-medium">{tool}</td>
                    <td className="px-5 py-3 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Get API Key */}
        <section className="p-5 rounded-xl bg-brand-50/50 border border-brand-100">
          <p className="text-sm text-brand-700">
            <strong>Get your API key:</strong> Go to{" "}
            <span className="font-medium">Settings → Developer</span> in the DriveMem dashboard.
          </p>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Troubleshooting</h2>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">•</span>
              Restart your AI tool after changing MCP configuration
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">•</span>
              Ensure your API key starts with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">ak_</code>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">•</span>
              Check the <strong>Connect</strong> page in DriveMem to verify connection status
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
