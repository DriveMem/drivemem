import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "API Reference — DriveMem Docs",
  description: "DriveMem REST API Reference documentation.",
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <pre className="rounded-xl bg-gray-950 border border-gray-800/60 p-5 overflow-x-auto text-sm leading-relaxed">
      <code className={`language-${lang} text-gray-300`}>{code}</code>
    </pre>
  )
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700",
    POST: "bg-blue-100 text-blue-700",
    PATCH: "bg-amber-100 text-amber-700",
    PUT: "bg-orange-100 text-orange-700",
    DELETE: "bg-red-100 text-red-700",
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${colors[method] ?? "bg-gray-100 text-gray-700"}`}>
      {method}
    </span>
  )
}

function Endpoint({ method, path, description, children }: { method: string; path: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <MethodBadge method={method} />
        <code className="text-sm font-mono font-semibold text-gray-900">{path}</code>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
      {children}
    </div>
  )
}

export default function ApiReferencePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          API REFERENCE
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
          DriveMem REST API
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          Programmatic access to your knowledge base — upload files, search semantically, and build AI-powered workflows.
        </p>
      </div>

      <div className="space-y-12">
        {/* Authentication */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Authentication</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            All requests require an API key passed in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-brand-600">Authorization</code> header.
            You can generate a key in <strong>Settings → Developer</strong>.
          </p>
          <CodeBlock code={`Authorization: Bearer ak_YOUR_KEY`} />
        </section>

        {/* Base URL */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Base URL</h2>
          <CodeBlock code={`https://api.drivemem.cloud/api/v1`} />
        </section>

        {/* Files API */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Files API</h2>
          <p className="text-gray-500 mb-6">Manage files in your knowledge base.</p>
          <div className="space-y-5">
            <Endpoint method="GET" path="/files" description="List all files. Supports optional query params ?folderId and ?status.">
              <CodeBlock code={`curl "https://api.drivemem.cloud/api/v1/files?status=indexed" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
              <CodeBlock lang="json" code={`{
  "files": [
    {
      "id": "file_abc123",
      "name": "meeting-notes.md",
      "status": "indexed",
      "folderId": "folder_xyz",
      "createdAt": "2025-01-15T08:30:00Z"
    }
  ]
}`} />
            </Endpoint>

            <Endpoint method="GET" path="/files/:id" description="Get details for a single file.">
              <CodeBlock code={`curl "https://api.drivemem.cloud/api/v1/files/file_abc123" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
            </Endpoint>

            <Endpoint method="POST" path="/files/upload" description="Upload a file. Use multipart/form-data with a 'file' field.">
              <CodeBlock code={`curl -X POST "https://api.drivemem.cloud/api/v1/files/upload" \\
  -H "Authorization: Bearer ak_YOUR_KEY" \\
  -F "file=@./notes.md" \\
  -F "folderId=folder_xyz"`} />
            </Endpoint>

            <Endpoint method="POST" path="/files/batch" description="Batch create multiple files from JSON.">
              <CodeBlock code={`curl -X POST "https://api.drivemem.cloud/api/v1/files/batch" \\
  -H "Authorization: Bearer ak_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"files": [{"name": "doc.md", "content": "# Hello"}]}'`} />
            </Endpoint>

            <Endpoint method="PATCH" path="/files/:id" description="Update file metadata (name, tags, folder, etc.)." >
              <CodeBlock code={`curl -X PATCH "https://api.drivemem.cloud/api/v1/files/file_abc123" \\
  -H "Authorization: Bearer ak_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "renamed-notes.md"}'`} />
            </Endpoint>

            <Endpoint method="PUT" path="/files/:id/content" description="Replace the content of an existing file." >
              <CodeBlock code={`curl -X PUT "https://api.drivemem.cloud/api/v1/files/file_abc123/content" \\
  -H "Authorization: Bearer ak_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Updated content here"}'`} />
            </Endpoint>

            <Endpoint method="DELETE" path="/files/:id" description="Permanently delete a file." >
              <CodeBlock code={`curl -X DELETE "https://api.drivemem.cloud/api/v1/files/file_abc123" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
            </Endpoint>

            <Endpoint method="PATCH" path="/files/:id/archive" description="Archive a file (soft delete)." >
              <CodeBlock code={`curl -X PATCH "https://api.drivemem.cloud/api/v1/files/file_abc123/archive" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
            </Endpoint>

            <Endpoint method="PATCH" path="/files/:id/unarchive" description="Restore an archived file." >
              <CodeBlock code={`curl -X PATCH "https://api.drivemem.cloud/api/v1/files/file_abc123/unarchive" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
            </Endpoint>
          </div>
        </section>

        {/* Search & AI API */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Search & AI API</h2>
          <p className="text-gray-500 mb-6">Semantic search, RAG Q&A, and knowledge storage.</p>
          <div className="space-y-5">
            <Endpoint method="GET" path="/search" description="Semantic search across your knowledge base.">
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left"><th className="py-2 pr-4 font-semibold text-gray-900">Param</th><th className="py-2 pr-4 font-semibold text-gray-900">Type</th><th className="py-2 font-semibold text-gray-900">Description</th></tr></thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">q</td><td className="py-2 pr-4">string</td><td className="py-2"><strong>Required.</strong> Search query.</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">limit</td><td className="py-2 pr-4">number</td><td className="py-2">Max results to return (default 5).</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">max_tokens</td><td className="py-2 pr-4">number</td><td className="py-2">Token budget for returned content.</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">format</td><td className="py-2 pr-4">string</td><td className="py-2">Response format: <code className="bg-gray-100 px-1 rounded text-xs">text</code> | <code className="bg-gray-100 px-1 rounded text-xs">structured</code> | <code className="bg-gray-100 px-1 rounded text-xs">summary</code></td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">contextBudget</td><td className="py-2 pr-4">number</td><td className="py-2">Token budget for context window.</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">scope</td><td className="py-2 pr-4">string</td><td className="py-2"><code className="bg-gray-100 px-1 rounded text-xs">project</code> | <code className="bg-gray-100 px-1 rounded text-xs">all</code></td></tr>
                    <tr><td className="py-2 pr-4 font-mono">projectId</td><td className="py-2 pr-4">string</td><td className="py-2">Scope search to a specific project/folder.</td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`curl "https://api.drivemem.cloud/api/v1/search?q=deployment+process&scope=all&limit=5&format=text" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
              <CodeBlock lang="json" code={`{
  "results": [
    {
      "fileName": "devops-guide.md",
      "fileId": "file_abc123",
      "score": 0.92,
      "text": "...the deployment process involves..."
    }
  ]
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/ask" description="Ask a question and get an AI-generated answer grounded in your files, with source citations.">
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left"><th className="py-2 pr-4 font-semibold text-gray-900">Body field</th><th className="py-2 pr-4 font-semibold text-gray-900">Type</th><th className="py-2 font-semibold text-gray-900">Description</th></tr></thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">question</td><td className="py-2 pr-4">string</td><td className="py-2"><strong>Required.</strong> The question to answer.</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">fileIds</td><td className="py-2 pr-4">string[]</td><td className="py-2">Limit answer to specific files.</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">contextBudget</td><td className="py-2 pr-4">number</td><td className="py-2">Token budget for context.</td></tr>
                    <tr><td className="py-2 pr-4 font-mono">preferFormat</td><td className="py-2 pr-4">string</td><td className="py-2"><code className="bg-gray-100 px-1 rounded text-xs">text</code> | <code className="bg-gray-100 px-1 rounded text-xs">structured</code> | <code className="bg-gray-100 px-1 rounded text-xs">summary</code></td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`curl -X POST "https://api.drivemem.cloud/api/v1/ask" \\
  -H "Authorization: Bearer ak_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"question": "What was decided about the auth architecture?"}'`} />
              <CodeBlock lang="json" code={`{
  "answer": "The team decided to use JWT with refresh tokens...",
  "sources": [
    { "fileId": "file_abc123", "fileName": "arch-decisions.md" }
  ]
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/store" description="Store a piece of knowledge (decision, note, insight) into your knowledge base.">
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left"><th className="py-2 pr-4 font-semibold text-gray-900">Body field</th><th className="py-2 pr-4 font-semibold text-gray-900">Type</th><th className="py-2 font-semibold text-gray-900">Description</th></tr></thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">content</td><td className="py-2 pr-4">string</td><td className="py-2"><strong>Required.</strong> The knowledge content to store.</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">title</td><td className="py-2 pr-4">string</td><td className="py-2">Optional title (auto-generated if omitted).</td></tr>
                    <tr><td className="py-2 pr-4 font-mono">tags</td><td className="py-2 pr-4">string</td><td className="py-2">Comma-separated tags, e.g. <code className="bg-gray-100 px-1 rounded text-xs">decision,architecture</code></td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`curl -X POST "https://api.drivemem.cloud/api/v1/store" \\
  -H "Authorization: Bearer ak_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Decided to use PostgreSQL for the main database", "title": "DB Decision", "tags": "decision,architecture"}'`} />
              <CodeBlock lang="json" code={`{
  "id": "file_def456",
  "title": "DB Decision",
  "fileName": "db-decision.md"
}`} />
            </Endpoint>
          </div>
        </section>

        {/* Insights API */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Insights API</h2>
          <p className="text-gray-500 mb-6">AI-generated insights discovered across your knowledge base.</p>
          <div className="space-y-5">
            <Endpoint method="GET" path="/insights" description="List all AI-generated insights (connections, patterns, and recommendations).">
              <CodeBlock code={`curl "https://api.drivemem.cloud/api/v1/insights" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
              <CodeBlock lang="json" code={`{
  "insights": [
    {
      "id": "ins_abc123",
      "type": "connection",
      "title": "Related architecture decisions",
      "description": "Your auth and database decisions share common scalability assumptions...",
      "sourceFileId": "file_abc123",
      "relatedFileId": "file_def456",
      "createdAt": "2025-02-10T14:00:00Z"
    }
  ]
}`} />
            </Endpoint>
          </div>
        </section>

        {/* Context Packet API */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Context Packet API</h2>
          <p className="text-gray-500 mb-6">Compile project context for AI tool integration.</p>
          <div className="space-y-5">
            <Endpoint method="GET" path="/context-packet" description="Get a compiled context packet for a project folder.">
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left"><th className="py-2 pr-4 font-semibold text-gray-900">Param</th><th className="py-2 pr-4 font-semibold text-gray-900">Type</th><th className="py-2 font-semibold text-gray-900">Description</th></tr></thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">folderId</td><td className="py-2 pr-4">string</td><td className="py-2"><strong>Required.</strong> The project folder to compile.</td></tr>
                    <tr><td className="py-2 pr-4 font-mono">format</td><td className="py-2 pr-4">string</td><td className="py-2"><code className="bg-gray-100 px-1 rounded text-xs">markdown</code> (default) | <code className="bg-gray-100 px-1 rounded text-xs">json</code></td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`curl "https://api.drivemem.cloud/api/v1/context-packet?folderId=folder_xyz&format=markdown" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
              <CodeBlock lang="json" code={`"# Project Context: My App\\n\\n## Files\\n- auth-design.md\\n- db-schema.md\\n\\n## Compiled Context\\n..."`} />
            </Endpoint>
          </div>
        </section>

        {/* User API */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User API</h2>
          <p className="text-gray-500 mb-6">Manage user profile.</p>
          <div className="space-y-5">
            <Endpoint method="GET" path="/users/me/profile" description="Get the current user's profile.">
              <CodeBlock code={`curl "https://api.drivemem.cloud/api/v1/users/me/profile" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
              <CodeBlock lang="json" code={`{
  "id": "user_abc123",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Inc",
  "role": "Engineering Lead"
}`} />
            </Endpoint>
            <Endpoint method="PATCH" path="/users/me/profile" description="Update the current user's profile.">
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left"><th className="py-2 pr-4 font-semibold text-gray-900">Body field</th><th className="py-2 pr-4 font-semibold text-gray-900">Type</th><th className="py-2 font-semibold text-gray-900">Description</th></tr></thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">name</td><td className="py-2 pr-4">string</td><td className="py-2">Display name.</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">company</td><td className="py-2 pr-4">string</td><td className="py-2">Company name.</td></tr>
                    <tr><td className="py-2 pr-4 font-mono">role</td><td className="py-2 pr-4">string</td><td className="py-2">Job title or role.</td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`curl -X PATCH "https://api.drivemem.cloud/api/v1/users/me/profile" \\
  -H "Authorization: Bearer ak_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Jane Doe", "company": "Acme Inc"}'`} />
            </Endpoint>
          </div>
        </section>

        {/* Timeline API */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Timeline API</h2>
          <p className="text-gray-500 mb-6">Activity feed of recent changes across your knowledge base.</p>
          <div className="space-y-5">
            <Endpoint method="GET" path="/timeline" description="Get a paginated activity timeline.">
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left"><th className="py-2 pr-4 font-semibold text-gray-900">Param</th><th className="py-2 pr-4 font-semibold text-gray-900">Type</th><th className="py-2 font-semibold text-gray-900">Description</th></tr></thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">limit</td><td className="py-2 pr-4">number</td><td className="py-2">Results per page (default 20).</td></tr>
                    <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono">page</td><td className="py-2 pr-4">number</td><td className="py-2">Page number (default 1).</td></tr>
                    <tr><td className="py-2 pr-4 font-mono">type</td><td className="py-2 pr-4">string</td><td className="py-2">Filter by event type, e.g. <code className="bg-gray-100 px-1 rounded text-xs">files</code></td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`curl "https://api.drivemem.cloud/api/v1/timeline?limit=20&page=1&type=files" \\
  -H "Authorization: Bearer ak_YOUR_KEY"`} />
              <CodeBlock lang="json" code={`{
  "events": [
    {
      "id": "evt_abc123",
      "type": "file.created",
      "fileName": "meeting-notes.md",
      "fileId": "file_abc123",
      "createdAt": "2025-02-10T14:00:00Z"
    }
  ],
  "total": 142
}`} />
            </Endpoint>
          </div>
        </section>

        {/* Rate Limits */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Rate Limits</h2>
          <p className="text-gray-600 leading-relaxed">
            No rate limits during beta. We may introduce reasonable limits in the future — we&apos;ll notify you well in advance.
          </p>
        </section>

        {/* Error Codes */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Error Codes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-semibold text-gray-900">Status</th>
                  <th className="py-2 pr-4 font-semibold text-gray-900">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono">400</td>
                  <td className="py-2">Bad Request — invalid parameters or body</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono">401</td>
                  <td className="py-2">Unauthorized — missing or invalid API key</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono">404</td>
                  <td className="py-2">Not Found — resource does not exist</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">500</td>
                  <td className="py-2">Internal Server Error — please try again or contact support</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
