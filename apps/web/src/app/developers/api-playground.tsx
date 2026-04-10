"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Play, Loader2, AlertTriangle, Clock, CheckCircle2, XCircle, LogIn } from "lucide-react"

/* ---------- Endpoint definitions ---------- */
interface EndpointParam {
  name: string
  label: string
  type: "text" | "textarea" | "select"
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
  params: EndpointParam[]
  isWrite?: boolean // requires confirmation
}

const ENDPOINTS: EndpointDef[] = [
  {
    id: "search",
    method: "GET",
    path: "/api/v1/search",
    label: "语义搜索",
    description: "自然语言检索知识库",
    params: [
      { name: "q", label: "搜索关键词", type: "text", placeholder: "输入搜索内容…", required: true },
      { name: "contextBudget", label: "Token 预算", type: "text", placeholder: "50000（可选）" },
      { name: "preferFormat", label: "返回格式", type: "select", options: ["text", "structured", "summary"] },
    ],
  },
  {
    id: "files",
    method: "GET",
    path: "/api/v1/files",
    label: "列出文件",
    description: "获取知识库中的所有文件",
    params: [
      { name: "detail", label: "详情级别", type: "select", options: ["full", "brief"], defaultValue: "full" },
    ],
  },
  {
    id: "ask",
    method: "POST",
    path: "/api/v1/ask",
    label: "RAG 问答",
    description: "基于知识库的 AI 问答",
    params: [
      { name: "question", label: "问题", type: "textarea", placeholder: "输入你的问题…", required: true },
      { name: "contextBudget", label: "Token 预算", type: "text", placeholder: "5000（可选）" },
    ],
  },
  {
    id: "file-detail",
    method: "GET",
    path: "/api/v1/files/:id",
    label: "文件详情",
    description: "获取单个文件详细信息",
    params: [
      { name: "id", label: "文件 ID", type: "text", placeholder: "输入文件 ID", required: true },
    ],
  },
  // Write operations (require confirmation)
  {
    id: "store",
    method: "POST",
    path: "/api/v1/store",
    label: "存入知识",
    description: "快速存入一段知识笔记",
    isWrite: true,
    params: [
      { name: "content", label: "内容", type: "textarea", placeholder: "输入要存储的内容…", required: true },
      { name: "title", label: "标题", type: "text", placeholder: "可选标题" },
      { name: "tags", label: "标签（逗号分隔）", type: "text", placeholder: "tag1,tag2" },
    ],
  },
  {
    id: "delete-file",
    method: "DELETE",
    path: "/api/v1/files/:id",
    label: "删除文件",
    description: "删除知识库中的文件",
    isWrite: true,
    params: [
      { name: "id", label: "文件 ID", type: "text", placeholder: "输入文件 ID", required: true },
    ],
  },
  {
    id: "batch",
    method: "POST",
    path: "/api/v1/files/batch",
    label: "批量操作",
    description: "批量 delete/archive/unarchive",
    isWrite: true,
    params: [
      { name: "action", label: "操作", type: "select", options: ["delete", "archive", "unarchive"], required: true },
      { name: "fileIds", label: "文件 ID（逗号分隔）", type: "text", placeholder: "id1,id2,id3", required: true },
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
            <h3 className="font-semibold text-[#1C1B18]">确认写入操作</h3>
            <p className="text-sm text-[#6B6966]">
              <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-mono font-semibold ${METHOD_COLORS[endpoint.method]}`}>
                {endpoint.method}
              </span>{" "}
              {endpoint.path}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[#6B6966]">
          此操作将修改你的知识库数据，确定要继续吗？
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#E5E4E1] px-4 py-2 text-sm font-medium text-[#6B6966] hover:bg-[#F8F7F5] transition"
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

/* ---------- Response Viewer ---------- */
function ResponseViewer({ response }: { response: { status: number; data: unknown; duration: number } | null }) {
  if (!response) return null

  const isSuccess = response.status >= 200 && response.status < 300
  const jsonStr = JSON.stringify(response.data, null, 2)

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-2">
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <span className={`rounded border px-1.5 py-0.5 text-xs font-mono font-semibold ${
          isSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {response.status}
        </span>
        <span className="flex items-center gap-1 text-xs text-[#6B6966]">
          <Clock className="h-3 w-3" />
          {response.duration}ms
        </span>
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

  const endpoint = ENDPOINTS.find(e => e.id === selectedId)!

  const setParam = (name: string, value: string) => {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }

  const buildRequest = useCallback(() => {
    let url = endpoint.path
    const headers: Record<string, string> = {}
    let body: string | undefined

    // Auth: session cookie is automatic; if not logged in, use API key
    if (!isLoggedIn && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    if (endpoint.method === "GET") {
      // Path params
      const pathParam = endpoint.params.find(p => url.includes(`:${p.name}`))
      if (pathParam && paramValues[pathParam.name]) {
        url = url.replace(`:${pathParam.name}`, encodeURIComponent(paramValues[pathParam.name]))
      }
      // Query params
      const queryParams = endpoint.params
        .filter(p => !url.includes(`:${p.name}`) && (paramValues[p.name] || p.defaultValue))
        .map(p => `${p.name}=${encodeURIComponent(paramValues[p.name] || p.defaultValue || "")}`)
      if (queryParams.length) url += `?${queryParams.join("&")}`
    } else if (endpoint.method === "POST") {
      headers["Content-Type"] = "application/json"
      const bodyObj: Record<string, unknown> = {}
      for (const p of endpoint.params) {
        const val = paramValues[p.name]
        if (val) {
          if (p.name === "tags") {
            bodyObj[p.name] = val.split(",").map(s => s.trim()).filter(Boolean)
          } else if (p.name === "fileIds") {
            bodyObj[p.name] = val.split(",").map(s => s.trim()).filter(Boolean)
          } else {
            bodyObj[p.name] = val
          }
        }
      }
      body = JSON.stringify(bodyObj)
    } else if (endpoint.method === "DELETE") {
      const pathParam = endpoint.params.find(p => url.includes(`:${p.name}`))
      if (pathParam && paramValues[pathParam.name]) {
        url = url.replace(`:${pathParam.name}`, encodeURIComponent(paramValues[pathParam.name]))
      }
    }

    return { url, headers, body }
  }, [endpoint, paramValues, isLoggedIn, apiKey])

  const executeRequest = useCallback(async () => {
    setLoading(true)
    setResponse(null)
    const { url, headers, body } = buildRequest()
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

  // Check required params
  const missingRequired = endpoint.params.some(p => p.required && !paramValues[p.name])

  return (
    <div className="mt-6">
      {/* Auth notice */}
      {!isLoggedIn && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <LogIn className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <span className="font-medium">未登录</span> —{" "}
            <a href="/login" className="underline hover:no-underline">登录</a> 后自动携带 session，或在下方填入 API Key。
          </div>
        </div>
      )}

      {!isLoggedIn && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#6B6966] mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="ak_..."
            className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm font-mono focus:border-[#4F5BD5] focus:outline-none focus:ring-1 focus:ring-[#4F5BD5]/30"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Endpoint list */}
        <div className="space-y-1 lg:border-r lg:border-[#E5E4E1] lg:pr-4">
          <p className="text-xs font-semibold text-[#6B6966] uppercase tracking-wider mb-2">Endpoints</p>
          {ENDPOINTS.map(ep => (
            <button
              key={ep.id}
              onClick={() => { setSelectedId(ep.id); setParamValues({}); setResponse(null) }}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                selectedId === ep.id
                  ? "bg-[#4F5BD5]/10 text-[#4F5BD5] font-medium"
                  : "text-[#6B6966] hover:bg-[#F8F7F5]"
              }`}
            >
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold ${METHOD_COLORS[ep.method]}`}>
                {ep.method}
              </span>
              <span className="truncate">{ep.label}</span>
              {ep.isWrite && (
                <AlertTriangle className="ml-auto h-3 w-3 shrink-0 text-amber-500" />
              )}
            </button>
          ))}
        </div>

        {/* Request form + response */}
        <div>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-mono font-bold ${METHOD_COLORS[endpoint.method]}`}>
                {endpoint.method}
              </span>
              <code className="text-sm font-mono text-[#1C1B18]">{endpoint.path}</code>
            </div>
            <p className="mt-1 text-sm text-[#6B6966]">{endpoint.description}</p>
          </div>

          {/* Params */}
          <div className="space-y-3">
            {endpoint.params.map(p => (
              <div key={p.name}>
                <label className="block text-xs font-medium text-[#6B6966] mb-1">
                  {p.label}
                  {p.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {p.type === "textarea" ? (
                  <textarea
                    value={paramValues[p.name] || ""}
                    onChange={e => setParam(p.name, e.target.value)}
                    placeholder={p.placeholder}
                    rows={3}
                    className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm focus:border-[#4F5BD5] focus:outline-none focus:ring-1 focus:ring-[#4F5BD5]/30"
                  />
                ) : p.type === "select" ? (
                  <select
                    value={paramValues[p.name] || p.defaultValue || ""}
                    onChange={e => setParam(p.name, e.target.value)}
                    className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm focus:border-[#4F5BD5] focus:outline-none focus:ring-1 focus:ring-[#4F5BD5]/30"
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
                    className="w-full rounded-lg border border-[#E5E4E1] bg-white px-3 py-2 text-sm font-mono focus:border-[#4F5BD5] focus:outline-none focus:ring-1 focus:ring-[#4F5BD5]/30"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || missingRequired || (!isLoggedIn && !apiKey)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[#4F5BD5] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3D49C4] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "请求中…" : "Send"}
          </button>

          {/* Response */}
          <ResponseViewer response={response} />
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
