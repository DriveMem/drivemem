"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Play, Loader2, AlertTriangle, Clock, CheckCircle2, XCircle, LogIn, Copy, Check, Terminal } from "lucide-react"

/* ---------- Type badge ---------- */
const TYPE_COLORS: Record<string, string> = {
  string: "bg-blue-50 text-blue-600 border-blue-200",
  number: "bg-amber-50 text-amber-600 border-amber-200",
  boolean: "bg-purple-50 text-purple-600 border-purple-200",
  file: "bg-emerald-50 text-emerald-600 border-emerald-200",
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`ml-1.5 inline-block rounded border px-1 py-0 text-[10px] font-mono font-semibold ${TYPE_COLORS[type] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {type}
    </span>
  )
}

/* ---------- Endpoint definitions ---------- */
interface EndpointParam {
  name: string
  label: string
  type: "text" | "textarea" | "select"
  dataType: "string" | "number" | "boolean" | "file"
  placeholder?: string
  required?: boolean
  options?: string[]
  defaultValue?: string
}

interface EndpointDef {
  id: string
  method: "GET" | "POST" | "DELETE" | "PATCH" | "PUT"
  path: string
  label: string
  description: string
  category: "read" | "write" | "webhook"
  params: EndpointParam[]
  isWrite?: boolean
}

const ENDPOINTS: EndpointDef[] = [
  // --- Read operations ---
  {
    id: "search",
    method: "GET",
    path: "/api/v1/search",
    label: "Semantic Search",
    description: "Search your knowledge base with natural language, returns most relevant file snippets",
    category: "read",
    params: [
      { name: "q", label: "Search query", type: "text", dataType: "string", placeholder: "Latest project progress", required: true },
      { name: "contextBudget", label: "Token budget", type: "text", dataType: "number", placeholder: "50000" },
      { name: "preferFormat", label: "Response format", type: "select", dataType: "string", options: ["text", "structured", "summary"] },
    ],
  },
  {
    id: "files",
    method: "GET",
    path: "/api/v1/files",
    label: "List Files",
    description: "Get all files in your knowledge base",
    category: "read",
    params: [
      { name: "detail", label: "Detail level", type: "select", dataType: "string", options: ["full", "brief"], defaultValue: "full" },
    ],
  },
  {
    id: "ask",
    method: "POST",
    path: "/api/v1/ask",
    label: "RAG Q&A",
    description: "AI Q&A based on your knowledge base with source citations",
    category: "read",
    params: [
      { name: "question", label: "Question", type: "textarea", dataType: "string", placeholder: "Summarize this week's progress based on files", required: true },
      { name: "contextBudget", label: "Token budget", type: "text", dataType: "number", placeholder: "5000" },
    ],
  },
  {
    id: "file-detail",
    method: "GET",
    path: "/api/v1/files/:id",
    label: "File Detail",
    description: "Get detailed info and AI summary for a single file",
    category: "read",
    params: [
      { name: "id", label: "File ID", type: "text", dataType: "string", placeholder: "abc-123-def-456", required: true },
      { name: "detail", label: "Detail level", type: "select", dataType: "string", options: ["brief", "full"] },
    ],
  },
  {
    id: "insights",
    method: "GET",
    path: "/api/v1/insights",
    label: "Get Insights",
    description: "AI-discovered file connections, contradictions, and trends",
    category: "read",
    params: [],
  },
  {
    id: "timeline",
    method: "GET",
    path: "/api/v1/timeline",
    label: "Timeline",
    description: "Knowledge base activity timeline (uploads, chats, insights)",
    category: "read",
    params: [
      { name: "limit", label: "Limit", type: "text", dataType: "number", placeholder: "20" },
    ],
  },
  // --- Write operations ---
  {
    id: "store",
    method: "POST",
    path: "/api/v1/store",
    label: "Store Knowledge",
    description: "Quickly store a knowledge note",
    category: "write",
    isWrite: true,
    params: [
      { name: "content", label: "Content", type: "textarea", dataType: "string", placeholder: "Decided to go with plan A because...", required: true },
      { name: "title", label: "Title", type: "text", dataType: "string", placeholder: "Decision record" },
      { name: "tags", label: "Tags (comma-separated)", type: "text", dataType: "string", placeholder: "decision,meeting" },
    ],
  },
  {
    id: "upload",
    method: "POST",
    path: "/api/v1/files/upload",
    label: "Upload File",
    description: "Upload file to knowledge base (multipart/form-data)",
    category: "write",
    isWrite: true,
    params: [
      { name: "filename", label: "Filename", type: "text", dataType: "string", placeholder: "report.md", required: true },
      { name: "content", label: "File content", type: "textarea", dataType: "string", placeholder: "# Report title\n\nContent...", required: true },
    ],
  },
  {
    id: "update-file",
    method: "PATCH",
    path: "/api/v1/files/:id",
    label: "Update File",
    description: "Rename file or update tags",
    category: "write",
    isWrite: true,
    params: [
      { name: "id", label: "File ID", type: "text", dataType: "string", placeholder: "abc-123-def-456", required: true },
      { name: "name", label: "New filename", type: "text", dataType: "string", placeholder: "renamed-file.md" },
      { name: "tags", label: "Tags (comma-separated)", type: "text", dataType: "string", placeholder: "important,project-a" },
    ],
  },
  {
    id: "delete-file",
    method: "DELETE",
    path: "/api/v1/files/:id",
    label: "Delete File",
    description: "Delete a file from your knowledge base",
    category: "write",
    isWrite: true,
    params: [
      { name: "id", label: "File ID", type: "text", dataType: "string", placeholder: "abc-123-def-456", required: true },
    ],
  },
  {
    id: "batch",
    method: "POST",
    path: "/api/v1/files/batch",
    label: "Batch Operations",
    description: "Batch delete / archive / unarchive files",
    category: "write",
    isWrite: true,
    params: [
      { name: "action", label: "Action", type: "select", dataType: "string", options: ["delete", "archive", "unarchive"], required: true },
      { name: "fileIds", label: "File IDs (comma-separated)", type: "text", dataType: "string", placeholder: "id1,id2,id3", required: true },
    ],
  },
  // --- Webhook operations ---
  {
    id: "webhooks-list",
    method: "GET",
    path: "/api/webhooks",
    label: "List Webhooks",
    description: "Get all registered webhooks",
    category: "webhook",
    params: [],
  },
  {
    id: "webhooks-create",
    method: "POST",
    path: "/api/webhooks",
    label: "Create Webhook",
    description: "Register a new webhook to receive event notifications",
    category: "webhook",
    isWrite: true,
    params: [
      { name: "url", label: "Callback URL", type: "text", dataType: "string", placeholder: "https://your-app.com/hook", required: true },
      { name: "events", label: "Event types (comma-separated)", type: "text", dataType: "string", placeholder: "file.indexed,insight.discovered", required: true },
    ],
  },
  {
    id: "webhooks-delete",
    method: "DELETE",
    path: "/api/webhooks/:id",
    label: "Delete Webhook",
    description: "Remove a registered webhook",
    category: "webhook",
    isWrite: true,
    params: [
      { name: "id", label: "Webhook ID", type: "text", dataType: "string", placeholder: "wh_xxx", required: true },
    ],
  },
  {
    id: "webhooks-deliveries",
    method: "GET",
    path: "/api/webhooks/:id/deliveries",
    label: "Delivery Log",
    description: "View delivery history for a webhook",
    category: "webhook",
    params: [
      { name: "id", label: "Webhook ID", type: "text", dataType: "string", placeholder: "wh_xxx", required: true },
      { name: "limit", label: "Limit", type: "text", dataType: "number", placeholder: "20" },
    ],
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  PATCH: "bg-purple-50 text-purple-700 border-purple-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
}

const CATEGORY_LABELS: Record<string, string> = {
  read: "📖 Read Operations",
  write: "✏️ Write Operations",
  webhook: "🔔 Webhook",
}

/* ---------- Confirmation Dialog ---------- */
function ConfirmDialog({ endpoint, onConfirm, onCancel }: { endpoint: EndpointDef; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-[#E5E4E1] bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1C1B18]">Confirm Write Operation</h3>
            <p className="text-sm text-[#6B6966]">
              <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-mono font-semibold ${METHOD_COLORS[endpoint.method]}`}>
                {endpoint.method}
              </span>{" "}
              {endpoint.path}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[#6B6966]">
          This will modify your knowledge base. Are you sure you want to continue?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#E5E4E1] px-4 py-2 text-sm font-medium text-[#6B6966] hover:bg-[#F8F7F5] transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Copy as curl ---------- */
function buildCurlCommand(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): string {
  const parts = [`curl -X ${method} '${window.location.origin}${url}'`]
  for (const [k, v] of Object.entries(headers)) {
    parts.push(`  -H '${k}: ${v}'`)
  }
  if (body) {
    parts.push(`  -d '${body}'`)
  }
  return parts.join(" \\\n")
}

/* ---------- Response Viewer ---------- */
function ResponseViewer({
  response,
  curlCommand,
}: {
  response: { status: number; data: unknown; duration: number } | null
  curlCommand: string | null
}) {
  const [copied, setCopied] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)

  if (!response) return null

  const isSuccess = response.status >= 200 && response.status < 300
  const jsonStr = JSON.stringify(response.data, null, 2)

  const copyJson = () => {
    navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCurl = () => {
    if (curlCommand) {
      navigator.clipboard.writeText(curlCommand)
      setCopiedCurl(true)
      setTimeout(() => setCopiedCurl(false), 2000)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className={`rounded border px-1.5 py-0.5 text-xs font-mono font-semibold ${
            isSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {response.status === 0 ? "ERR" : response.status}
          </span>
          <span className="flex items-center gap-1 text-xs text-[#6B6966]">
            <Clock className="h-3 w-3" />
            {response.duration}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          {curlCommand && (
            <button
              onClick={copyCurl}
              className="flex items-center gap-1.5 rounded-md border border-[#E5E4E1] px-2.5 py-1 text-xs font-medium text-[#6B6966] hover:bg-[#F8F7F5] transition"
            >
              {copiedCurl ? <Check className="h-3 w-3 text-emerald-600" /> : <Terminal className="h-3 w-3" />}
              {copiedCurl ? "Copied" : "Copy as curl"}
            </button>
          )}
          <button
            onClick={copyJson}
            className="flex items-center gap-1.5 rounded-md border border-[#E5E4E1] px-2.5 py-1 text-xs font-medium text-[#6B6966] hover:bg-[#F8F7F5] transition"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
      </div>
      <pre className="max-h-[400px] overflow-auto rounded-lg bg-[#1C1B18] p-4 font-mono text-sm text-[#E5E4E1]">
        <code>{jsonStr}</code>
      </pre>
    </div>
  )
}

/* ---------- Main Playground Component ---------- */
export default function ApiPlayground() {
  const { status } = useSession()
  const isLoggedIn = status === "authenticated"

  const [selectedId, setSelectedId] = useState(ENDPOINTS[0].id)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ status: number; data: unknown; duration: number } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [lastCurl, setLastCurl] = useState<string | null>(null)

  const endpoint = ENDPOINTS.find(e => e.id === selectedId)!

  const setParam = (name: string, value: string) => {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }

  const buildRequest = useCallback(() => {
    let url = endpoint.path
    const headers: Record<string, string> = {}
    let body: string | undefined

    // Auth
    if (!isLoggedIn && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    if (endpoint.method === "GET") {
      // Path params
      for (const p of endpoint.params) {
        if (url.includes(`:${p.name}`) && paramValues[p.name]) {
          url = url.replace(`:${p.name}`, encodeURIComponent(paramValues[p.name]))
        }
      }
      // Query params
      const queryParams = endpoint.params
        .filter(p => !endpoint.path.includes(`:${p.name}`) && (paramValues[p.name] || p.defaultValue))
        .map(p => `${p.name}=${encodeURIComponent(paramValues[p.name] || p.defaultValue || "")}`)
      if (queryParams.length) url += `?${queryParams.join("&")}`
    } else if (endpoint.method === "POST") {
      headers["Content-Type"] = "application/json"
      const bodyObj: Record<string, unknown> = {}
      for (const p of endpoint.params) {
        const val = paramValues[p.name]
        if (val) {
          if (p.name === "tags" || p.name === "fileIds" || p.name === "events") {
            bodyObj[p.name] = val.split(",").map(s => s.trim()).filter(Boolean)
          } else if (p.dataType === "number") {
            const n = Number(val)
            if (!isNaN(n)) bodyObj[p.name] = n
          } else {
            bodyObj[p.name] = val
          }
        }
      }
      body = JSON.stringify(bodyObj)
    } else if (endpoint.method === "DELETE" || endpoint.method === "PATCH") {
      // Path params
      for (const p of endpoint.params) {
        if (url.includes(`:${p.name}`) && paramValues[p.name]) {
          url = url.replace(`:${p.name}`, encodeURIComponent(paramValues[p.name]))
        }
      }
      // PATCH body
      if (endpoint.method === "PATCH") {
        headers["Content-Type"] = "application/json"
        const bodyObj: Record<string, unknown> = {}
        for (const p of endpoint.params) {
          if (endpoint.path.includes(`:${p.name}`)) continue
          const val = paramValues[p.name]
          if (val) {
            if (p.name === "tags") {
              bodyObj[p.name] = val.split(",").map(s => s.trim()).filter(Boolean).join(",")
            } else {
              bodyObj[p.name] = val
            }
          }
        }
        body = JSON.stringify(bodyObj)
      }
    }

    return { url, headers, body }
  }, [endpoint, paramValues, isLoggedIn, apiKey])

  const executeRequest = useCallback(async () => {
    setLoading(true)
    setResponse(null)
    const { url, headers, body } = buildRequest()

    // Build curl command
    setLastCurl(buildCurlCommand(endpoint.method, url, headers, body))

    const start = performance.now()
    try {
      const res = await fetch(url, {
        method: endpoint.method,
        headers,
        body,
        credentials: isLoggedIn ? "include" : "omit",
      })
      const duration = Math.round(performance.now() - start)
      let data: unknown
      const ct = res.headers.get("content-type") || ""
      if (ct.includes("json")) {
        data = await res.json()
      } else {
        data = await res.text()
      }
      setResponse({ status: res.status, data, duration })
    } catch (err) {
      const duration = Math.round(performance.now() - start)
      setResponse({ status: 0, data: { error: err instanceof Error ? err.message : "Network error" }, duration })
    } finally {
      setLoading(false)
    }
  }, [buildRequest, endpoint.method, isLoggedIn])

  const handleSend = () => {
    if (endpoint.isWrite) {
      setShowConfirm(true)
    } else {
      executeRequest()
    }
  }

  const missingRequired = endpoint.params.some(p => p.required && !paramValues[p.name])

  // Group endpoints by category
  const categories = ["read", "write", "webhook"] as const

  return (
    <div className="mt-6">
      {/* Auth notice */}
      {!isLoggedIn && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <LogIn className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <span className="font-medium">Please log in or enter your API Key below</span> —{" "}
            <a href="/login" className="underline hover:no-underline">Log in</a> to use automatic session auth.
          </div>
        </div>
      )}

      {!isLoggedIn && (
        <div className="mb-4">
          <label className="flex items-center gap-1 text-xs font-medium text-[#6B6966] mb-1">
            API Key <TypeBadge type="string" />
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="ak_..."
            className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Endpoint list grouped by category */}
        <div className="space-y-4 lg:border-r lg:border-[#E5E4E1] lg:pr-4 max-h-[600px] overflow-y-auto">
          {categories.map(cat => {
            const eps = ENDPOINTS.filter(e => e.category === cat)
            if (!eps.length) return null
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-[#6B6966] uppercase tracking-wider mb-1.5 px-1">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="space-y-0.5">
                  {eps.map(ep => (
                    <button
                      key={ep.id}
                      onClick={() => { setSelectedId(ep.id); setParamValues({}); setResponse(null); setLastCurl(null) }}
                      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                        selectedId === ep.id
                          ? "bg-brand-500/10 text-brand-500 font-medium"
                          : "text-[#6B6966] hover:bg-[#F8F7F5]"
                      }`}
                    >
                      <span className={`shrink-0 rounded border px-1 py-0 text-[10px] font-mono font-bold leading-relaxed ${METHOD_COLORS[ep.method]}`}>
                        {ep.method}
                      </span>
                      <span className="truncate text-xs">{ep.label}</span>
                      {ep.isWrite && (
                        <AlertTriangle className="ml-auto h-3 w-3 shrink-0 text-amber-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Request form + response */}
        <div>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-mono font-bold ${METHOD_COLORS[endpoint.method]}`}>
                {endpoint.method}
              </span>
              <code className="text-sm font-mono text-[#1C1B18]">{endpoint.path}</code>
              {endpoint.isWrite && (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Write operations
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#6B6966]">{endpoint.description}</p>
          </div>

          {/* Params */}
          {endpoint.params.length > 0 ? (
            <div className="space-y-3">
              {endpoint.params.map(p => (
                <div key={p.name}>
                  <label className="flex items-center gap-0.5 text-xs font-medium text-[#6B6966] mb-1">
                    {p.label}
                    {p.required && <span className="text-red-500 ml-0.5">*</span>}
                    <TypeBadge type={p.dataType} />
                  </label>
                  {p.type === "textarea" ? (
                    <textarea
                      value={paramValues[p.name] || ""}
                      onChange={e => setParam(p.name, e.target.value)}
                      placeholder={p.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    />
                  ) : p.type === "select" ? (
                    <select
                      value={paramValues[p.name] || p.defaultValue || ""}
                      onChange={e => setParam(p.name, e.target.value)}
                      className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    >
                      <option value="">— Select —</option>
                      {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={paramValues[p.name] || ""}
                      onChange={e => setParam(p.name, e.target.value)}
                      placeholder={p.placeholder}
                      className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B6966] italic mb-2">This endpoint requires no parameters</p>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || missingRequired || (!isLoggedIn && !apiKey)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "Sending..." : "Send"}
          </button>

          {/* Response */}
          <ResponseViewer response={response} curlCommand={lastCurl} />
        </div>
      </div>

      {/* Confirm dialog for write ops */}
      {showConfirm && (
        <ConfirmDialog
          endpoint={endpoint}
          onConfirm={() => { setShowConfirm(false); executeRequest() }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
