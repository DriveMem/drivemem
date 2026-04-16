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
    label: "语义搜索",
    description: "自然语言检索知识库，返回最相关的文件片段和相似度分数",
    category: "read",
    params: [
      { name: "q", label: "搜索关键词", type: "text", dataType: "string", placeholder: "项目最新进展", required: true },
      { name: "contextBudget", label: "Token 预算", type: "text", dataType: "number", placeholder: "50000" },
      { name: "preferFormat", label: "返回格式", type: "select", dataType: "string", options: ["text", "structured", "summary"] },
    ],
  },
  {
    id: "files",
    method: "GET",
    path: "/api/v1/files",
    label: "列出文件",
    description: "获取知识库中的所有文件列表",
    category: "read",
    params: [
      { name: "detail", label: "详情级别", type: "select", dataType: "string", options: ["full", "brief"], defaultValue: "full" },
    ],
  },
  {
    id: "ask",
    method: "POST",
    path: "/api/v1/ask",
    label: "RAG 问答",
    description: "基于知识库的 AI 问答，自动引用来源",
    category: "read",
    params: [
      { name: "question", label: "问题", type: "textarea", dataType: "string", placeholder: "基于文件总结本周工作进展", required: true },
      { name: "contextBudget", label: "Token 预算", type: "text", dataType: "number", placeholder: "5000" },
    ],
  },
  {
    id: "file-detail",
    method: "GET",
    path: "/api/v1/files/:id",
    label: "文件详情",
    description: "获取单个文件的详细信息和 AI 摘要",
    category: "read",
    params: [
      { name: "id", label: "文件 ID", type: "text", dataType: "string", placeholder: "abc-123-def-456", required: true },
      { name: "detail", label: "详情级别", type: "select", dataType: "string", options: ["brief", "full"] },
    ],
  },
  {
    id: "insights",
    method: "GET",
    path: "/api/v1/insights",
    label: "获取洞察",
    description: "AI 主动发现的文件关联、矛盾观点和共同趋势",
    category: "read",
    params: [],
  },
  {
    id: "timeline",
    method: "GET",
    path: "/api/v1/timeline",
    label: "时间线",
    description: "知识库活动时间线（上传、对话、洞察等）",
    category: "read",
    params: [
      { name: "limit", label: "返回条数", type: "text", dataType: "number", placeholder: "20" },
    ],
  },
  // --- Write operations ---
  {
    id: "store",
    method: "POST",
    path: "/api/v1/store",
    label: "存入知识",
    description: "快速存入一段知识笔记",
    category: "write",
    isWrite: true,
    params: [
      { name: "content", label: "内容", type: "textarea", dataType: "string", placeholder: "今天决定采用方案 A，原因是…", required: true },
      { name: "title", label: "标题", type: "text", dataType: "string", placeholder: "决策记录" },
      { name: "tags", label: "标签（逗号分隔）", type: "text", dataType: "string", placeholder: "decision,meeting" },
    ],
  },
  {
    id: "upload",
    method: "POST",
    path: "/api/v1/files/upload",
    label: "上传文件",
    description: "上传文件到知识库（multipart/form-data）",
    category: "write",
    isWrite: true,
    params: [
      { name: "filename", label: "文件名", type: "text", dataType: "string", placeholder: "report.md", required: true },
      { name: "content", label: "文件内容", type: "textarea", dataType: "string", placeholder: "# 报告标题\n\n正文内容…", required: true },
    ],
  },
  {
    id: "update-file",
    method: "PATCH",
    path: "/api/v1/files/:id",
    label: "更新文件属性",
    description: "重命名文件或修改标签",
    category: "write",
    isWrite: true,
    params: [
      { name: "id", label: "文件 ID", type: "text", dataType: "string", placeholder: "abc-123-def-456", required: true },
      { name: "name", label: "新文件名", type: "text", dataType: "string", placeholder: "renamed-file.md" },
      { name: "tags", label: "标签（逗号分隔）", type: "text", dataType: "string", placeholder: "important,project-a" },
    ],
  },
  {
    id: "delete-file",
    method: "DELETE",
    path: "/api/v1/files/:id",
    label: "删除文件",
    description: "删除知识库中的文件",
    category: "write",
    isWrite: true,
    params: [
      { name: "id", label: "文件 ID", type: "text", dataType: "string", placeholder: "abc-123-def-456", required: true },
    ],
  },
  {
    id: "batch",
    method: "POST",
    path: "/api/v1/files/batch",
    label: "批量操作",
    description: "批量 delete / archive / unarchive 文件",
    category: "write",
    isWrite: true,
    params: [
      { name: "action", label: "操作", type: "select", dataType: "string", options: ["delete", "archive", "unarchive"], required: true },
      { name: "fileIds", label: "文件 ID（逗号分隔）", type: "text", dataType: "string", placeholder: "id1,id2,id3", required: true },
    ],
  },
  // --- Webhook operations ---
  {
    id: "webhooks-list",
    method: "GET",
    path: "/api/webhooks",
    label: "列出 Webhooks",
    description: "获取已注册的所有 Webhook",
    category: "webhook",
    params: [],
  },
  {
    id: "webhooks-create",
    method: "POST",
    path: "/api/webhooks",
    label: "创建 Webhook",
    description: "注册新的 Webhook 接收事件推送",
    category: "webhook",
    isWrite: true,
    params: [
      { name: "url", label: "回调 URL", type: "text", dataType: "string", placeholder: "https://your-app.com/hook", required: true },
      { name: "events", label: "事件类型（逗号分隔）", type: "text", dataType: "string", placeholder: "file.indexed,insight.discovered", required: true },
    ],
  },
  {
    id: "webhooks-delete",
    method: "DELETE",
    path: "/api/webhooks/:id",
    label: "删除 Webhook",
    description: "移除已注册的 Webhook",
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
    label: "投递日志",
    description: "查看某个 Webhook 的投递记录",
    category: "webhook",
    params: [
      { name: "id", label: "Webhook ID", type: "text", dataType: "string", placeholder: "wh_xxx", required: true },
      { name: "limit", label: "返回条数", type: "text", dataType: "number", placeholder: "20" },
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
  read: "📖 读取操作",
  write: "✏️ 写入操作",
  webhook: "🔔 Webhook",
}

/* ---------- Confirmation Dialog ---------- */
function ConfirmDialog({ endpoint, onConfirm, onCancel }: { endpoint: EndpointDef; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-white/[0.06] bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100">确认写入操作</h3>
            <p className="text-sm text-gray-400">
              <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-mono font-semibold ${METHOD_COLORS[endpoint.method]}`}>
                {endpoint.method}
              </span>{" "}
              {endpoint.path}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          此操作将修改你的知识库数据，确定要继续吗？
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/[0.06] px-4 py-2 text-sm font-medium text-gray-400 hover:bg-white/[0.05] transition"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition"
          >
            确认执行
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
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {response.duration}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          {curlCommand && (
            <button
              onClick={copyCurl}
              className="flex items-center gap-1.5 rounded-md border border-white/[0.06] px-2.5 py-1 text-xs font-medium text-gray-400 hover:bg-white/[0.05] transition"
            >
              {copiedCurl ? <Check className="h-3 w-3 text-emerald-600" /> : <Terminal className="h-3 w-3" />}
              {copiedCurl ? "已复制" : "Copy as curl"}
            </button>
          )}
          <button
            onClick={copyJson}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.06] px-2.5 py-1 text-xs font-medium text-gray-400 hover:bg-white/[0.05] transition"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            {copied ? "已复制" : "Copy JSON"}
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
            <span className="font-medium">请先登录或在下方填入 API Key</span> —{" "}
            <a href="/login" className="underline hover:no-underline">登录</a> 后自动携带 session。
          </div>
        </div>
      )}

      {!isLoggedIn && (
        <div className="mb-4">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-400 mb-1">
            API Key <TypeBadge type="string" />
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="ak_..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.05] px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Endpoint list grouped by category */}
        <div className="space-y-4 lg:border-r lg:border-white/[0.06] lg:pr-4 max-h-[600px] overflow-y-auto">
          {categories.map(cat => {
            const eps = ENDPOINTS.filter(e => e.category === cat)
            if (!eps.length) return null
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
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
                          : "text-gray-400 hover:bg-white/[0.05]"
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
              <code className="text-sm font-mono text-gray-100">{endpoint.path}</code>
              {endpoint.isWrite && (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  写入操作
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400">{endpoint.description}</p>
          </div>

          {/* Params */}
          {endpoint.params.length > 0 ? (
            <div className="space-y-3">
              {endpoint.params.map(p => (
                <div key={p.name}>
                  <label className="flex items-center gap-0.5 text-xs font-medium text-gray-400 mb-1">
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
                      className="w-full rounded-lg border border-white/[0.06] bg-white/[0.05] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    />
                  ) : p.type === "select" ? (
                    <select
                      value={paramValues[p.name] || p.defaultValue || ""}
                      onChange={e => setParam(p.name, e.target.value)}
                      className="w-full rounded-lg border border-white/[0.06] bg-white/[0.05] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    >
                      <option value="">— 选择 —</option>
                      {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={paramValues[p.name] || ""}
                      onChange={e => setParam(p.name, e.target.value)}
                      placeholder={p.placeholder}
                      className="w-full rounded-lg border border-white/[0.06] bg-white/[0.05] px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic mb-2">此端点无需参数</p>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || missingRequired || (!isLoggedIn && !apiKey)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "请求中…" : "Send"}
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
