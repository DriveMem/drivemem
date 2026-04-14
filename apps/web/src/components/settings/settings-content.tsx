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
      toast.success("API Key Created")
    } catch {
      toast.error("Create failed")
    } finally {
      setCreating(false)
    }
  }

  const deleteKey = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/api-keys/${id}`, { method: "DELETE" })
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success("Deleted")
    } catch {
      toast.error("Delete failed")
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>🔑 API Keys</CardTitle>
        <CardDescription>Create API Key Let AI agents access your knowledge library</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Key Name（e.g., My Agent)" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          <Button onClick={createKey} disabled={!keyName.trim() || creating}>
            {creating ? "Create..." : "Create Key"}
          </Button>
        </div>

        {newKey && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-600 mb-2">⚠️ Please save your API Key — shown only once</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono select-all">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied") }}>
                Copy
              </Button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No API Keys yet</p>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}••••••••</p>
                  <p className="text-xs text-muted-foreground">
                    Created on {new Date(k.createdAt).toLocaleDateString("zh-CN")}
                    {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString("zh-CN")}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteKey(k.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          📖 API Documentation: Upload files, search knowledge, AI Q&A. See <a href="/developers" className="text-[#4F5BD5] hover:underline">Developer Docs</a>
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

  const mcpUrl = "https://drivemem.cloud/mcp"
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
        <CardTitle>🔌 MCP Quick integration</CardTitle>
        <CardDescription>Connect DriveMem to MCP-compatible AI tools</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MCP Server URL */}
        <div>
          <label className="text-sm font-medium">MCP Server URL</label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm font-mono select-all">{mcpUrl}</code>
            <Button size="sm" variant="outline" onClick={() => copyWithFeedback(mcpUrl, setUrlCopied)}>
              {urlCopied ? "✓ Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Config JSON */}
        <div>
          <label className="text-sm font-medium">Configuration example</label>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the following JSON to your MCP client configuration file:
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
              {configCopied ? "✓ Copied" : "Copy"}
            </Button>
          </div>
          {!newKey && apiKeyPrefix && (
            <p className="mt-2 text-xs text-amber-600">
              💡 The configuration shows a placeholder. Replace with your full API Key <code className="font-mono">YOUR_API_KEY</code>
            </p>
          )}
          {newKey && (
            <p className="mt-2 text-xs text-emerald-600">
              ✅ Your newly created API Key has been auto-filled and is ready to copy
            </p>
          )}
        </div>

        {/* Security tip */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-xs text-amber-700">
            🔒 <strong>Security notice</strong>：MCP Connections are encrypted via HTTPS. Do not expose your API Key on insecure networks.
            We recommend creating separate keys for different agents and rotating them regularly.
          </p>
        </div>

        {/* Doc link */}
        <a href="/developers" className="inline-flex items-center gap-1 text-sm text-[#4F5BD5] hover:underline">
          ViewFull developer docs ↗
        </a>
      </CardContent>
    </Card>
  )
}

const WEBHOOK_EVENTS = [
  { id: 'file.indexed', label: 'File indexing complete', desc: 'File uploaded and AI indexing complete' },
  { id: 'insight.discovered', label: 'AI discovered insights', desc: 'New knowledge connections discovered' },
  { id: 'file.deleted', label: 'FilesDelete', desc: 'Fileswas deleted' },
]

function ConnectedAgentsCard() {
  const [keys, setKeys] = useState<any[]>([])

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

  const activeKeys = keys.filter(k => k.lastUsedAt)
  const inactiveKeys = keys.filter(k => !k.lastUsedAt)

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔗 Connected Agents</CardTitle>
        <CardDescription>ViewWhich AI tools are using your knowledge library</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No agents connected yet. Create an API Key to get started.</p>
        ) : (
          <>
            {activeKeys.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Active connections</p>
                {activeKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last active: {new Date(k.lastUsedAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {k.scopes?.map((s: string) => (
                        <span key={s} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          s === 'admin' ? 'bg-red-500/10 text-red-600' :
                          s === 'write' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-green-500/10 text-green-600'
                        }`}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {inactiveKeys.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Not used</p>
                {inactiveKeys.map(k => (
                  <div key={k.id} className="flex items-center gap-3 rounded-lg border border-dashed p-3 opacity-60">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted shrink-0" />
                    <p className="text-sm">{k.name}</p>
                    <p className="text-xs text-muted-foreground ml-auto">Never used</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

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
      toast.success("Webhook Created")
    } catch {
      toast.error("Create failed")
    } finally {
      setCreating(false)
    }
  }

  const deleteHook = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/webhooks/${id}`, { method: "DELETE" })
      setHooks(prev => prev.filter(h => h.id !== id))
      toast.success("Deleted")
    } catch {
      toast.error("Delete failed")
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
      toast.error("Update failed")
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
        <CardTitle>🔔 Webhook Event push</CardTitle>
        <CardDescription>Automatically notify your app when file indexing is complete or AI discovers new insights</CardDescription>
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
              {creating ? "Create..." : "Add"}
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
            <p className="text-sm font-medium text-amber-600 mb-2">⚠️ Please save your Signing Secret — shown only once</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono select-all break-all">{newSecret}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newSecret); toast.success("Copied") }}>
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Use this secret to verify <code className="font-mono">X-AIDrive-Signature</code> header（HMAC-SHA256）
            </p>
          </div>
        )}

        {/* Webhook list */}
        {hooks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No Webhooks yet</p>
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
                          toast.success(`✅ Test successful — HTTP ${result.statusCode}`)
                        } else {
                          toast.error(`❌ Test failed${result.statusCode ? ` — HTTP ${result.statusCode}` : ""}${result.error ? `: ${result.error}` : ""}`)
                        }
                      } catch { toast.error("SendFailed") }
                    }}
                    className="rounded-full px-2 py-0.5 text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => toggleHook(h.id, !h.active)}
                    className={`rounded-full px-2 py-0.5 text-xs ${h.active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}
                  >
                    {h.active ? "Enabled" : "Disabled"}
                  </button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteHook(h.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Each event sends a JSON POST containing <code className="font-mono">X-AIDrive-Signature</code> Signature。
          <a href="/developers" className="text-[#4F5BD5] hover:underline ml-1">ViewDocs ↗</a>
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

  if (loading) return <p className="text-xs text-muted-foreground py-2">Loading delivery records...</p>
  if (deliveries.length === 0) return <p className="text-xs text-muted-foreground py-2">NoneDelivery records</p>

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-medium mb-2">📋 RecentDelivery records</h4>
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
  const [name, setName] = useState("User")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    getSession().then((s) => {
      if (s) {
        setSession(s)
        setName(s.user?.name || "User")
      }
    })
  }, [])

  const [memories, setMemories] = useState<any[]>([])

  // Profile state
  const [profileRole, setProfileRole] = useState("")
  const [profileGoal, setProfileGoal] = useState("")
  const [profileBg, setProfileBg] = useState("")
  const [profilePrefs, setProfilePrefs] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { apiFetch } = await import("@/lib/api")
        const data = await apiFetch("/api/users/me/profile")
        setProfileRole(data.role || "")
        setProfileGoal(data.currentGoal || "")
        setProfileBg(data.background || "")
        setProfilePrefs(data.preferences || "")
      } catch { /* ignore */ }
    }
    fetchProfile()
  }, [])

  const saveProfile = async () => {
    setProfileSaving(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch("/api/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ role: profileRole, currentGoal: profileGoal, background: profileBg, preferences: profilePrefs }),
      })
      toast.success("ProfileSaved")
    } catch {
      toast.error("SaveFailed")
    } finally {
      setProfileSaving(false)
    }
  }

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
      toast.success("Deleted")
      fetchMemories()
    } catch { toast.error("Delete failed") }
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
      const apiBase = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : "https://api.drivemem.cloud"
      const res = await fetch(apiBase + "/api/users/me/export", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("ExportFailed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ai-drive-export-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("ExportFailed，Please try again later")
    }
  }

  const handleDelete = () => {
    if (deleteConfirm === "ConfirmDelete") {
      alert("Account deleted (mock)")
      setDeleteOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setSettingsTab("general")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${settingsTab === "general" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          ⚙️ General
        </button>
        <button
          onClick={() => setSettingsTab("developer")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${settingsTab === "developer" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          🔧 Developer
        </button>
      </div>

      {settingsTab === "developer" ? (
        <>
          <p className="text-sm text-muted-foreground">These features are for advanced users who need access via API or AI Agent</p>
          <ApiKeysCard />
          <ConnectedAgentsCard />
          <WebhookCard />
        </>
      ) : (
      <>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {session?.user?.email && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={session.user.email} readOnly className="bg-muted" />
            </div>
          )}
          <Button size="sm" className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white" onClick={() => toast.success("Saved")}>Save</Button>
        </CardContent>
      </Card>

      {/* AI Profile */}
      <Card>
        <CardHeader>
          <CardTitle>🧠 AI Profile</CardTitle>
          <CardDescription>Help AI understand you better — all connected AI tools will automatically receive this information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Your role</Label>
            <Input id="role" placeholder="e.g., Product Manager, Developer, Researcher" value={profileRole} onChange={(e) => setProfileRole(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Current goal</Label>
            <Input id="goal" placeholder="e.g., Build an AI knowledge management product" value={profileGoal} onChange={(e) => setProfileGoal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="background">Background</Label>
            <Input id="background" placeholder="e.g., 3 years of AI product experience" value={profileBg} onChange={(e) => setProfileBg(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prefs">AI Preferences</Label>
            <Input id="prefs" placeholder="e.g., Prefer structured output" value={profilePrefs} onChange={(e) => setProfilePrefs(e.target.value)} />
          </div>
          <Button size="sm" className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white" onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? "Save..." : "SaveProfile"}
          </Button>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
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
                    Storage: {storageUsed} GB / {storageTotal} GB {pct > 95 ? "⚠️ Almost used up" : pct > 80 ? "⚡ Approaching limit" : ""}
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
                    Today's chats: {chatUsedToday} / {chatLimitToday} {chatPct > 95 ? "⚠️ Almost used up" : chatPct > 80 ? "⚡ Approaching limit" : ""}
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
          <CardTitle>🧠 AI Memory</CardTitle>
          <p className="text-sm text-muted-foreground">AI Preferences and interests learned from your conversations</p>
        </CardHeader>
        <CardContent>
          {memories.length === 0 ? (
            <p className="text-sm text-muted-foreground">AI Learning your preferences, chat more and it will appear ✨</p>
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
          <CardTitle>ModifyPassword</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
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
                toast.success("PasswordModified")
                setCurrentPassword("")
                setNewPassword("")
              } catch (e: any) { toast.error(e.message || "ModifyFailed") }
            }}
          >
            ModifyPassword
          </Button>
          {(!currentPassword || !newPassword || newPassword.length < 6) && (
            <p className="text-xs text-muted-foreground">
              {!currentPassword && !newPassword
                ? "Please enterCurrent and new password"
                : !currentPassword
                ? "Please enterCurrent password"
                : !newPassword
                ? "Please enterNew password"
                : "New password must be at least 6 characters"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your files, conversation data, and account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleExport}>
                    Export data
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>ExportAll files and conversation history as a ZIP archive</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
            <p className="text-sm text-red-600">
              ⚠️ DeleteThis will permanently delete all files, conversations, and AI memory. This action cannot be undone.
            </p>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">Delete account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600">⚠️ ConfirmDelete account</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  DeleteThis will permanently delete all files, conversations, and AI memory. This action cannot be undone. Please enter <strong>ConfirmDelete</strong> to continue.
                </p>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type "Confirm delete"'
                />
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== "ConfirmDelete"}
                  onClick={handleDelete}
                >
                  Permanently delete
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
