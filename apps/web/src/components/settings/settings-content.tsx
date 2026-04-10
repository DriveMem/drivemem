"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { getSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function ApiKeysCard() {
  const [keys, setKeys] = useState<any[]>([])
  const [keyName, setKeyName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const { apiFetch } = await import("@/lib/api")
        const data = await apiFetch("/api/api-keys")
        setKeys(data?.keys || [])
      } catch { /* ignore */ }
    }
    fetchKeys()
  }, [])

  const createKey = async () => {
    setCreating(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/api-keys", { method: "POST", body: JSON.stringify({ name: keyName.trim() }) })
      setNewKey(data.key)
      setKeyName("")
      const list = await apiFetch("/api/api-keys")
      setKeys(list?.keys || [])
      toast.success("API Key 已创建")
    } catch {
      toast.error("创建失败")
    } finally {
      setCreating(false)
    }
  }

  const deleteKey = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/api-keys/${id}`, { method: "DELETE" })
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success("已删除")
    } catch {
      toast.error("删除失败")
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>🔑 API Keys</CardTitle>
        <CardDescription>创建 API Key 让 AI agent 接入你的知识库</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Key 名称（如 My Agent）" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          <Button onClick={createKey} disabled={!keyName.trim() || creating}>
            {creating ? "创建中..." : "创建 Key"}
          </Button>
        </div>

        {newKey && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-600 mb-2">⚠️ 请保存你的 API Key — 只显示一次</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono select-all">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("已复制") }}>
                复制
              </Button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">还没有 API Key</p>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}••••••••</p>
                  <p className="text-xs text-muted-foreground">
                    创建于 {new Date(k.createdAt).toLocaleDateString("zh-CN")}
                    {k.lastUsedAt && ` · 最后使用 ${new Date(k.lastUsedAt).toLocaleDateString("zh-CN")}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteKey(k.id)}>
                  删除
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          📖 API 文档：上传文件、搜索知识、AI 问答。详见 <a href="/developers" className="text-[#4F5BD5] hover:underline">开发者文档</a>
        </p>
      </CardContent>
    </Card>

    {/* MCP Quick Connect Card */}
    <McpQuickConnectCard apiKeyPrefix={keys.length > 0 ? keys[0].keyPrefix : null} newKey={newKey} />
    </>
  )
}

function McpQuickConnectCard({ apiKeyPrefix, newKey }: { apiKeyPrefix: string | null; newKey: string | null }) {
  const [urlCopied, setUrlCopied] = useState(false)
  const [configCopied, setConfigCopied] = useState(false)

  const mcpUrl = "https://drive.verrrnm.cloud/mcp"
  const keyDisplay = newKey || (apiKeyPrefix ? `${apiKeyPrefix}••••••••` : "YOUR_API_KEY")
  const keyForConfig = newKey || "YOUR_API_KEY"

  const configJson = JSON.stringify({
    mcpServers: {
      "ai-drive": {
        url: mcpUrl,
        headers: {
          Authorization: `Bearer ${keyForConfig}`
        }
      }
    }
  }, null, 2)

  const copyWithFeedback = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔌 MCP 快速接入</CardTitle>
        <CardDescription>将 AI Drive 接入支持 MCP 的 AI 工具</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MCP Server URL */}
        <div>
          <label className="text-sm font-medium">MCP Server URL</label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm font-mono select-all">{mcpUrl}</code>
            <Button size="sm" variant="outline" onClick={() => copyWithFeedback(mcpUrl, setUrlCopied)}>
              {urlCopied ? "✓ 已复制" : "复制"}
            </Button>
          </div>
        </div>

        {/* Config JSON */}
        <div>
          <label className="text-sm font-medium">配置示例</label>
          <p className="mt-1 text-xs text-muted-foreground">
            将以下 JSON 添加到你的 MCP 客户端配置文件：
          </p>
          <ul className="mt-1 text-xs text-muted-foreground space-y-0.5 ml-3">
            <li>• <strong>Claude Desktop</strong>: <code className="rounded bg-muted px-1 text-[11px]">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
            <li>• <strong>Cursor</strong>: <code className="rounded bg-muted px-1 text-[11px]">~/.cursor/mcp.json</code></li>
          </ul>
          <div className="mt-2 relative">
            <pre className="rounded-lg border bg-[#1C1B18] p-3 text-sm font-mono text-[#E5E4E1] overflow-x-auto">
              <code>{configJson}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 h-7 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => copyWithFeedback(configJson, setConfigCopied)}
            >
              {configCopied ? "✓ 已复制" : "复制"}
            </Button>
          </div>
          {!newKey && apiKeyPrefix && (
            <p className="mt-2 text-xs text-amber-600">
              💡 配置中显示的是占位符。请用你的完整 API Key 替换 <code className="font-mono">YOUR_API_KEY</code>
            </p>
          )}
          {newKey && (
            <p className="mt-2 text-xs text-emerald-600">
              ✅ 已自动填入你刚创建的 API Key，可直接复制使用
            </p>
          )}
        </div>

        {/* Security tip */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-xs text-amber-700">
            🔒 <strong>安全提示</strong>：MCP 连接通过 HTTPS 加密传输。请勿在不安全的网络中暴露 API Key。
            建议为不同 agent 创建独立的 Key，并定期轮换。
          </p>
        </div>

        {/* Doc link */}
        <a href="/developers" className="inline-flex items-center gap-1 text-sm text-[#4F5BD5] hover:underline">
          查看完整开发者文档 ↗
        </a>
      </CardContent>
    </Card>
  )
}

const WEBHOOK_EVENTS = [
  { id: 'file.indexed', label: '文件索引完成', desc: '文件上传并完成 AI 索引' },
  { id: 'insight.discovered', label: 'AI 发现洞察', desc: '发现新的知识关联' },
  { id: 'file.deleted', label: '文件删除', desc: '文件被删除' },
]

function WebhookCard() {
  const [hooks, setHooks] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['file.indexed'])
  const [creating, setCreating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  useEffect(() => {
    const fetchHooks = async () => {
      try {
        const { apiFetch } = await import("@/lib/api")
        const data = await apiFetch("/api/webhooks")
        setHooks(data?.webhooks || [])
      } catch { /* ignore */ }
    }
    fetchHooks()
  }, [])

  const createHook = async () => {
    if (!url.trim()) return
    setCreating(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: url.trim(), events }),
      })
      setNewSecret(data.secret)
      setUrl('')
      const list = await apiFetch("/api/webhooks")
      setHooks(list?.webhooks || [])
      toast.success("Webhook 已创建")
    } catch {
      toast.error("创建失败")
    } finally {
      setCreating(false)
    }
  }

  const deleteHook = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/webhooks/${id}`, { method: "DELETE" })
      setHooks(prev => prev.filter(h => h.id !== id))
      toast.success("已删除")
    } catch {
      toast.error("删除失败")
    }
  }

  const toggleHook = async (id: string, active: boolean) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      })
      setHooks(prev => prev.map(h => h.id === id ? { ...h, active } : h))
    } catch {
      toast.error("更新失败")
    }
  }

  const toggleEvent = (eventId: string) => {
    setEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔔 Webhook 事件推送</CardTitle>
        <CardDescription>当文件索引完成或 AI 发现新洞察时，自动通知你的应用</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://your-app.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={createHook} disabled={!url.trim() || events.length === 0 || creating}>
              {creating ? "创建中..." : "添加"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map(evt => (
              <button
                key={evt.id}
                onClick={() => toggleEvent(evt.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  events.includes(evt.id)
                    ? "bg-[#4F5BD5] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title={evt.desc}
              >
                {evt.label}
              </button>
            ))}
          </div>
        </div>

        {/* New secret warning */}
        {newSecret && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-600 mb-2">⚠️ 请保存你的 Signing Secret — 只显示一次</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono select-all break-all">{newSecret}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newSecret); toast.success("已复制") }}>
                复制
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              用此 secret 验证 <code className="font-mono">X-AIDrive-Signature</code> header（HMAC-SHA256）
            </p>
          </div>
        )}

        {/* Webhook list */}
        {hooks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">还没有 Webhook</p>
        ) : (
          <div className="space-y-2">
            {hooks.map(h => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{h.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {h.events?.map((e: string) => (
                      <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{e}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={async () => {
                      try {
                        const { apiFetch: af } = await import("@/lib/api")
                        const result = await af(`/api/webhooks/${h.id}/test`, { method: "POST" })
                        if (result.success) {
                          toast.success(`✅ 测试成功 — HTTP ${result.statusCode}`)
                        } else {
                          toast.error(`❌ 测试失败${result.statusCode ? ` — HTTP ${result.statusCode}` : ""}${result.error ? `: ${result.error}` : ""}`)
                        }
                      } catch { toast.error("发送失败") }
                    }}
                    className="rounded-full px-2 py-0.5 text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition"
                  >
                    测试
                  </button>
                  <button
                    onClick={() => toggleHook(h.id, !h.active)}
                    className={`rounded-full px-2 py-0.5 text-xs ${h.active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}
                  >
                    {h.active ? "启用" : "停用"}
                  </button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteHook(h.id)}>
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          每个事件发送 JSON POST，含 <code className="font-mono">X-AIDrive-Signature</code> 签名。
          <a href="/developers" className="text-[#4F5BD5] hover:underline ml-1">查看文档 ↗</a>
        </p>

        {/* Delivery Log */}
        {hooks.length > 0 && <WebhookDeliveryLog />}
      </CardContent>
    </Card>
  )
}

function WebhookDeliveryLog() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const { apiFetch } = await import("@/lib/api")
        const data = await apiFetch("/api/webhooks/deliveries?limit=20")
        setDeliveries(data?.deliveries || [])
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    fetchDeliveries()
  }, [])

  if (loading) return <p className="text-xs text-muted-foreground py-2">加载投递记录...</p>
  if (deliveries.length === 0) return <p className="text-xs text-muted-foreground py-2">暂无投递记录</p>

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-medium mb-2">📋 最近投递记录</h4>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {deliveries.map((d: any) => (
          <div key={d.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
            <span className={`h-2 w-2 rounded-full shrink-0 ${d.success ? "bg-green-500" : "bg-red-500"}`} />
            <span className="font-mono text-muted-foreground shrink-0">{d.event}</span>
            <span className="truncate text-muted-foreground flex-1">{d.url}</span>
            {d.statusCode && <span className={`shrink-0 font-mono ${d.success ? "text-green-600" : "text-red-500"}`}>{d.statusCode}</span>}
            {d.duration && <span className="shrink-0 text-muted-foreground">{d.duration}ms</span>}
            <span className="shrink-0 text-muted-foreground/60">{new Date(d.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

type SettingsTab = "general" | "developer"

export default function SettingsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "developer" ? "developer" : "general"
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(initialTab)
  const [session, setSession] = useState<any>(null)
  const [name, setName] = useState("用户")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    getSession().then((s) => {
      if (s) {
        setSession(s)
        setName(s.user?.name || "用户")
      }
    })
  }, [])

  const [memories, setMemories] = useState<any[]>([])

  const fetchMemories = async () => {
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/users/me/memories")
      setMemories(data.memories || [])
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchMemories() }, [])

  const handleDeleteMemory = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/users/me/memories/${id}`, { method: "DELETE" })
      toast.success("已删除")
      fetchMemories()
    } catch { toast.error("删除失败") }
  }

  const [storageUsed, setStorageUsed] = useState<string>("—")
  const [storageTotal, setStorageTotal] = useState<string>("—")
  const [chatUsedToday, setChatUsedToday] = useState<string>("—")
  const [chatLimitToday, setChatLimitToday] = useState<string>("—")

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const { apiFetch } = await import("@/lib/api")
        const data = await apiFetch("/api/users/me")
        setStorageUsed(((data.storageUsed || 0) / 1073741824).toFixed(2))
        setStorageTotal(((data.storageLimit || 5368709120) / 1073741824).toFixed(1))
        setChatUsedToday(String(data.dailyChatCount ?? "—"))
        setChatLimitToday(String(data.dailyChatLimit ?? 20))
      } catch {
        // API not available, keep fallback "—"
      }
    }
    fetchUsage()
  }, [])

  const handleExport = async () => {
    try {
      const s = await getSession()
      const token = (s as any)?.accessToken
      const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
      const apiBase = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : "https://api.verrrnm.cloud"
      const res = await fetch(apiBase + "/api/users/me/export", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("导出失败")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ai-drive-export-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("导出失败，请稍后重试")
    }
  }

  const handleDelete = () => {
    if (deleteConfirm === "确认删除") {
      alert("账号已删除（mock）")
      setDeleteOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setSettingsTab("general")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${settingsTab === "general" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          ⚙️ 通用
        </button>
        <button
          onClick={() => setSettingsTab("developer")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${settingsTab === "developer" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          🔧 开发者
        </button>
      </div>

      {settingsTab === "developer" ? (
        <>
          <p className="text-sm text-muted-foreground">这些功能面向需要通过 API 或 AI Agent 接入的高级用户</p>
          <ApiKeysCard />
          <WebhookCard />
        </>
      ) : (
      <>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {session?.user?.email && (
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" value={session.user.email} readOnly className="bg-muted" />
            </div>
          )}
          <Button size="sm" className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white" onClick={() => toast.success("已保存")}>保存</Button>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>用量</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            {(() => {
              const pct = storageUsed !== "—" && storageTotal !== "—" ? (parseFloat(storageUsed) / parseFloat(storageTotal)) * 100 : 0
              const barColor = pct > 95 ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-emerald-500"
              const textColor = pct > 95 ? "text-red-500" : pct > 80 ? "text-yellow-600" : "text-muted-foreground"
              return (
                <>
                  <p className={`mb-1 text-sm ${textColor}`}>
                    存储空间：{storageUsed} GB / {storageTotal} GB {pct > 95 ? "⚠️ 即将用完" : pct > 80 ? "⚡ 接近上限" : ""}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              )
            })()}
          </div>
          <div>
            {(() => {
              const chatPct = chatUsedToday !== "—" && chatLimitToday !== "—" ? (parseInt(chatUsedToday) / parseInt(chatLimitToday)) * 100 : 0
              const chatBarColor = chatPct > 95 ? "bg-red-500" : chatPct > 80 ? "bg-yellow-500" : "bg-emerald-500"
              const chatTextColor = chatPct > 95 ? "text-red-500" : chatPct > 80 ? "text-yellow-600" : "text-muted-foreground"
              return (
                <>
                  <p className={`mb-1 text-sm ${chatTextColor}`}>
                    今日对话：{chatUsedToday} / {chatLimitToday} 次 {chatPct > 95 ? "⚠️ 即将用完" : chatPct > 80 ? "⚡ 接近上限" : ""}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${chatBarColor} transition-all`}
                      style={{ width: `${chatPct}%` }}
                    />
                  </div>
                </>
              )
            })()}
          </div>
        </CardContent>
      </Card>

      {/* AI Memory */}
      <Card>
        <CardHeader>
          <CardTitle>🧠 AI 记忆</CardTitle>
          <p className="text-sm text-muted-foreground">AI 从你的对话中学到的偏好和关注点</p>
        </CardHeader>
        <CardContent>
          {memories.length === 0 ? (
            <p className="text-sm text-muted-foreground">AI 会自动记住你们的对话要点。<a href="/chat" className="text-[#4F5BD5] hover:underline">开始一次对话试试 →</a></p>
          ) : (
            <ul className="space-y-3">
              {memories.map(m => (
                <li key={m.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{m.key}</p>
                    <p className="text-xs text-muted-foreground">{m.value}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{new Date(m.createdAt).toLocaleDateString("zh-CN")}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeleteMemory(m.id)}>
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl h-12" />
          </div>
          <Button
            size="sm"
            className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white"
            disabled={!currentPassword || !newPassword || newPassword.length < 6}
            onClick={async () => {
              try {
                const { apiFetch } = await import("@/lib/api")
                await apiFetch("/api/users/me/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) })
                toast.success("密码已修改")
                setCurrentPassword("")
                setNewPassword("")
              } catch (e: any) { toast.error(e.message || "修改失败") }
            }}
          >
            修改密码
          </Button>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
          <CardDescription>管理你的文件、对话数据和账号</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleExport}>
                    导出数据
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>导出所有文件和对话记录为 ZIP 压缩包</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
            <p className="text-sm text-red-600">
              ⚠️ 删除账号将永久移除所有文件、对话记录和 AI 记忆，此操作不可撤销。
            </p>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">删除账号</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600">⚠️ 确认删除账号</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  删除账号将永久清除所有文件、对话记录和 AI 记忆，此操作不可撤销。请输入 <strong>确认删除</strong> 以继续。
                </p>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='输入「确认删除」'
                />
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== "确认删除"}
                  onClick={handleDelete}
                >
                  永久删除
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  )
}
