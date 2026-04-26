import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Concepts — DriveMem Docs",
  description:
    "Understand DriveMem's core architecture: knowledge base, projects, MCP integration, context compilation, activity tracking, and the LLM API proxy.",
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <pre className="rounded-xl bg-gray-950 border border-gray-800/60 p-5 overflow-x-auto text-sm leading-relaxed">
      <code className={`language-${lang} text-gray-300`}>{code}</code>
    </pre>
  )
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold text-gray-900 tracking-tight mt-14 mb-4 scroll-mt-20">
      {children}
    </h2>
  )
}

export default function ConceptsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          CONCEPTS
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
          Core Concepts
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          A high-level overview of DriveMem&apos;s architecture and how it turns your files into
          persistent, searchable knowledge for any AI tool.
        </p>
      </div>

      {/* Table of contents */}
      <nav className="mb-12 rounded-xl border border-gray-200/60 bg-gray-50/60 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">On this page</p>
        <ul className="space-y-1.5 text-sm">
          {[
            ["knowledge-base", "Knowledge Base"],
            ["projects", "Projects (Folders)"],
            ["mcp", "MCP (Model Context Protocol)"],
            ["context-compilation", "Context Compilation"],
            ["knowledge-activity", "Knowledge Activity"],
            ["llm-api-proxy", "LLM API Proxy"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-gray-600 hover:text-brand-600 transition-colors">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Knowledge Base ── */}
      <SectionHeading id="knowledge-base">Knowledge Base</SectionHeading>

      <p className="text-gray-600 leading-relaxed mb-4">
        Your knowledge base is the foundation of DriveMem. It stores every file you upload, breaks
        it into searchable pieces, and makes the content available to any connected AI tool.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Files, Chunks &amp; Embeddings</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        Each uploaded file is split into <strong>chunks</strong> — small, semantically meaningful
        segments of text. Every chunk is converted into a high-dimensional
        <strong> embedding</strong> vector, enabling fast semantic search across your entire
        knowledge base.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Processing Pipeline</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        When you upload a file, DriveMem runs a five-stage pipeline:
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm font-mono text-gray-700 mb-4">
        {["Upload", "Parse", "Chunk", "Embed", "Index"].map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            <span className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">{step}</span>
            {i < 4 && <span className="text-gray-400">→</span>}
          </span>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Supported Formats</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          ["PDF", ".pdf"],
          ["Word", ".docx"],
          ["Plain Text", ".txt"],
          ["Markdown", ".md"],
        ].map(([name, ext]) => (
          <div key={ext} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
            <p className="font-semibold text-gray-900 text-sm">{name}</p>
            <p className="text-xs text-gray-400 font-mono">{ext}</p>
          </div>
        ))}
      </div>

      {/* ── Projects ── */}
      <SectionHeading id="projects">Projects (Folders)</SectionHeading>

      <p className="text-gray-600 leading-relaxed mb-4">
        Projects let you organize files into logical groups — a repository, a product area, a
        client engagement, or any scope that makes sense to you.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Scoped Search</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        When you search or compile context within a project, only files belonging to that project
        (plus any unassigned global files) are considered. This keeps results relevant and reduces
        noise.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Project-Level Context</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        Each project can produce its own compiled context — a curated knowledge snapshot tailored to
        a specific task or conversation. This is especially useful when working on multiple
        independent workstreams.
      </p>

      {/* ── MCP ── */}
      <SectionHeading id="mcp">MCP (Model Context Protocol)</SectionHeading>

      <p className="text-gray-600 leading-relaxed mb-4">
        The{" "}
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 hover:underline"
        >
          Model Context Protocol
        </a>{" "}
        is an open standard that lets AI applications access external data sources through a
        unified interface. DriveMem acts as an <strong>MCP server</strong>, exposing your knowledge
        base to any compatible client.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Supported Clients</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        DriveMem works with Cursor, Claude Desktop, Windsurf, and any tool that speaks MCP.
        See the{" "}
        <Link href="/docs/mcp" className="text-brand-600 hover:underline">
          MCP Integration guide
        </Link>{" "}
        for setup instructions.
      </p>

      {/* ── Context Compilation ── */}
      <SectionHeading id="context-compilation">Context Compilation</SectionHeading>

      <p className="text-gray-600 leading-relaxed mb-4">
        Context compilation is how DriveMem turns a raw knowledge base into the precise slice of
        information an AI model needs for its current task.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">The 9-Step Pipeline</h3>
      <p className="text-gray-600 leading-relaxed mb-3">
        When context is requested, DriveMem runs a multi-stage compiler:
      </p>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600 mb-4 pl-1">
        <li>Parse the incoming query or task description</li>
        <li>Identify relevant projects and scope</li>
        <li>Retrieve candidate chunks via semantic search</li>
        <li>Score and rank by relevance</li>
        <li>Deduplicate overlapping content</li>
        <li>Apply token budget constraints</li>
        <li>Assemble into structured context blocks</li>
        <li>Add source citations and metadata</li>
        <li>Format for the target model</li>
      </ol>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Model-Aware Injection</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        Different models have different context windows. DriveMem automatically adjusts the amount
        of injected context based on the target model — smaller models receive a focused subset,
        while larger models get more comprehensive context.
      </p>

      {/* ── Knowledge Activity ── */}
      <SectionHeading id="knowledge-activity">Knowledge Activity</SectionHeading>

      <p className="text-gray-600 leading-relaxed mb-4">
        DriveMem tracks all agent interactions and knowledge-base changes so you always know
        what&apos;s happening.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Activity Tracking</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        Every search, context compilation, file upload, and sync event is logged. The
        Dashboard shows a live activity feed so you can monitor how your AI tools use the
        knowledge base.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Notifications</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        DriveMem notifies you when files finish indexing, when synced sources update, and when
        content becomes stale. This keeps your knowledge base healthy without manual monitoring.
      </p>

      {/* ── LLM API Proxy ── */}
      <SectionHeading id="llm-api-proxy">LLM API Proxy</SectionHeading>

      <p className="text-gray-600 leading-relaxed mb-4">
        The LLM API Proxy sits between your application and any OpenAI- or Anthropic-compatible API.
        It <strong>intercepts</strong> outgoing requests, <strong>injects</strong> relevant context
        from your knowledge base, and <strong>harvests</strong> valuable information from responses.
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Quick Setup</h3>
      <CodeBlock
        code={`# Start the proxy (defaults to port 4141)
npx drivemem proxy --api-key=dm_...

# Point your app at the proxy
export OPENAI_BASE_URL=http://localhost:4141/v1`}
      />

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Supported Formats</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        The proxy understands both <strong>OpenAI</strong> (<code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">/v1/chat/completions</code>)
        and <strong>Anthropic</strong> (<code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">/v1/messages</code>)
        request formats. Any tool or framework that targets these APIs works out of the box.
      </p>

      {/* Next steps */}
      <div className="mt-16 rounded-xl border border-gray-200/60 bg-gray-50/60 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Next Steps</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>
            →{" "}
            <Link href="/docs/quickstart" className="text-brand-600 hover:underline">
              Quick Start
            </Link>{" "}
            — get up and running in 5 minutes
          </li>
          <li>
            →{" "}
            <Link href="/docs/mcp" className="text-brand-600 hover:underline">
              MCP Integration
            </Link>{" "}
            — connect Cursor, Claude Desktop, and more
          </li>
          <li>
            →{" "}
            <Link href="/docs/api" className="text-brand-600 hover:underline">
              API Reference
            </Link>{" "}
            — full endpoint documentation
          </li>
        </ul>
      </div>
    </div>
  )
}
