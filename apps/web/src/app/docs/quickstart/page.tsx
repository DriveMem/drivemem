"use client"

import Link from "next/link"
import { useState, useCallback } from "react"

/* ================================================================
   DriveMem — Developer Quick Start Guide
   Public page: /docs/quickstart
   ================================================================ */

// ---------- Copy button for code blocks ----------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])
  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-medium transition-all
        bg-gray-700/60 hover:bg-gray-600 text-gray-300 hover:text-white backdrop-blur-sm"
      aria-label="Copy code"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  )
}

// ---------- Code block ----------

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative group rounded-xl overflow-hidden bg-gray-950 border border-gray-800/60">
      <CopyButton text={code} />
      <pre className="p-5 pr-20 overflow-x-auto text-sm leading-relaxed">
        <code className={`language-${lang}`}>{highlightBash(code)}</code>
      </pre>
    </div>
  )
}

// Minimal syntax highlighting for bash/curl commands
function highlightBash(code: string) {
  const lines = code.split("\n")
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = []
    let rest = line

    // Comments
    if (rest.trimStart().startsWith("#")) {
      return (
        <span key={i}>
          <span className="text-gray-500">{rest}</span>
          {"\n"}
        </span>
      )
    }

    // Highlight strings in quotes
    const regex = /(["'])(.*?)\1/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(rest)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${i}-${lastIndex}`} className="text-gray-300">
            {rest.slice(lastIndex, match.index)}
          </span>
        )
      }
      parts.push(
        <span key={`${i}-${match.index}`} className="text-emerald-400">
          {match[0]}
        </span>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < rest.length) {
      parts.push(
        <span key={`${i}-rest`} className="text-gray-300">
          {rest.slice(lastIndex)}
        </span>
      )
    }

    // Highlight curl, flags
    return (
      <span key={i}>
        {parts.length > 0 ? parts : <span className="text-gray-300">{rest}</span>}
        {"\n"}
      </span>
    )
  })
}

// ---------- Step component ----------

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 sm:gap-5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold mt-0.5">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

// ---------- Tab selector ----------

function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  badge: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2.5
        ${
          active
            ? "bg-brand-500 text-white shadow-brand-md"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        }`}
    >
      {children}
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
        }`}
      >
        {badge}
      </span>
    </button>
  )
}

// ================================================================
// Page
// ================================================================

export default function QuickStartPage() {
  const [activeTab, setActiveTab] = useState<"api" | "mcp">("api")

  return (
    <div className="min-h-screen bg-white">

      {/* ---- Hero ---- */}
      <header className="pt-16 sm:pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            DEVELOPER GUIDE
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-4">
            Get Started with DriveMem
            <br />
            <span className="text-brand-500">in 5 Minutes</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Your AI&apos;s persistent memory layer. Upload knowledge, search
            semantically, ask questions — via REST API or MCP.
          </p>
        </div>
      </header>

      {/* ---- Tab selector ---- */}
      <div className="max-w-4xl mx-auto px-6 pb-10">
        <div className="flex flex-wrap gap-3 justify-center">
          <TabButton
            active={activeTab === "api"}
            onClick={() => setActiveTab("api")}
            badge="2 min"
          >
            ⚡ REST API
          </TabButton>
          <TabButton
            active={activeTab === "mcp"}
            onClick={() => setActiveTab("mcp")}
            badge="3 min"
          >
            🔌 MCP Protocol
          </TabButton>
        </div>
      </div>

      {/* ---- Steps ---- */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-10">
          {activeTab === "api" ? <RestApiSteps /> : <McpSteps />}
        </div>
      </section>

      {/* ---- API Reference Table ---- */}
      <section className="border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Available API Endpoints
          </h2>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Base URL:{" "}
            <code className="bg-gray-100 px-2 py-0.5 rounded text-brand-600 text-xs font-mono">
              https://drivemem.cloud/api/v1
            </code>
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Method
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Path
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["POST", "/files/upload", "Upload file (multipart)"],
                  ["GET", "/search?q=", "Semantic search"],
                  ["POST", "/ask", "RAG Q&A"],
                  ["POST", "/store", "Store knowledge snippet"],
                  ["GET", "/files", "List files"],
                  ["GET", "/files/:id", "File detail"],
                  ["DELETE", "/files/:id", "Delete file"],
                  ["GET", "/insights", "Knowledge insights"],
                  ["POST", "/context/compile", "Compile context"],
                ].map(([method, path, desc], i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          method === "POST"
                            ? "bg-emerald-50 text-emerald-600"
                            : method === "GET"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {method}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-700">
                      {path}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- Use Cases ---- */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          What You Can Build
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              emoji: "🧠",
              title: "Personal Knowledge",
              desc: "Upload docs, ask AI questions about your files",
            },
            {
              emoji: "🤖",
              title: "Agent Memory",
              desc: "Give Claude/Cursor persistent memory via MCP",
            },
            {
              emoji: "👥",
              title: "Team Wiki",
              desc: "Connect Notion/Google Drive, unified AI Q&A",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="border border-gray-200 rounded-xl p-6 hover:border-brand-200 hover:shadow-brand-sm transition-all"
            >
              <div className="text-3xl mb-3">{card.emoji}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to give your AI a memory?
          </h2>
          <p className="text-gray-500 mb-6">
            Free plan includes 50 files, unlimited searches, and full API access.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold text-base transition-colors shadow-brand-md hover:shadow-brand-lg"
          >
            Start Free →
          </Link>
        </div>
      </section>

    </div>
  )
}

// ================================================================
// REST API Steps
// ================================================================

function RestApiSteps() {
  return (
    <>
      <Step number={1} title="Create your API key">
        <p className="text-gray-500 text-sm leading-relaxed">
          Sign up at{" "}
          <a
            href="https://drivemem.cloud/signup"
            className="text-brand-500 underline underline-offset-2"
          >
            drivemem.cloud
          </a>{" "}
          → Go to <strong>Settings → Developer → Create API Key</strong>
        </p>
      </Step>

      <Step number={2} title="Upload your first file">
        <CodeBlock
          code={`curl -X POST https://drivemem.cloud/api/v1/files/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@notes.md"`}
        />
      </Step>

      <Step number={3} title="Search your knowledge">
        <CodeBlock
          code={`curl https://drivemem.cloud/api/v1/search?q=your+query \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
        />
      </Step>

      <Step number={4} title="Ask questions (RAG)">
        <CodeBlock
          code={`curl -X POST https://drivemem.cloud/api/v1/ask \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"question": "What did I decide about pricing?"}'`}
        />
        <p className="text-gray-500 text-sm">
          That&apos;s it! DriveMem handles chunking, embedding, and retrieval automatically.
        </p>
      </Step>
    </>
  )
}

// ================================================================
// MCP Protocol Steps
// ================================================================

function McpSteps() {
  return (
    <>
      <Step number={1} title="Get your MCP Server URL">
        <p className="text-gray-500 text-sm leading-relaxed">
          Sign up at{" "}
          <a
            href="https://drivemem.cloud/signup"
            className="text-brand-500 underline underline-offset-2"
          >
            drivemem.cloud
          </a>{" "}
          → Go to <strong>Settings → Developer</strong> to find your MCP Server URL.
        </p>
        <CodeBlock
          lang="text"
          code="Server URL: https://drivemem.cloud/api/mcp"
        />
      </Step>

      <Step number={2} title="Configure Claude Desktop">
        <p className="text-gray-500 text-sm mb-2">
          Add to your <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">claude_desktop_config.json</code>:
        </p>
        <CodeBlock
          lang="json"
          code={`{
  "mcpServers": {
    "drivemem": {
      "url": "https://drivemem.cloud/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
        />
      </Step>

      <Step number={3} title="Configure Cursor">
        <p className="text-gray-500 text-sm leading-relaxed">
          Open <strong>Cursor Settings → MCP</strong> and add a new server with the
          same URL and Authorization header.
        </p>
      </Step>

      <Step number={4} title="Try it!">
        <p className="text-gray-500 text-sm leading-relaxed mb-3">
          In Claude or Cursor, just say:
        </p>
        <CodeBlock
          code={`# Try these prompts:
"Search my knowledge about [topic]"
"Store this decision: we chose PostgreSQL for the main DB"
"What are the insights from my files?"`}
        />
        <div className="mt-4 p-4 rounded-xl bg-brand-50/50 border border-brand-100">
          <p className="text-sm font-medium text-brand-700 mb-2">
            Available MCP Tools
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "search",
              "ask",
              "store",
              "upload_file",
              "list_files",
              "file_detail",
              "get_insights",
              "compile_context",
              "timeline",
              "work_items",
            ].map((tool) => (
              <span
                key={tool}
                className="bg-white border border-brand-200 text-brand-600 text-xs font-mono px-2 py-1 rounded-md"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </Step>
    </>
  )
}
