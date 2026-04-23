"use client"
import { useState, useEffect, useCallback } from "react"
import { useSession, getSession } from "next-auth/react"
import Link from "next/link"
import { Copy, Check, Monitor, Globe, Puzzle, ChevronDown, ChevronRight, Key, Users, Bell, RefreshCw, Webhook, Database, Terminal, MoreHorizontal, Pencil, Unplug, ScrollText, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"


/* ---------- Relative Time ---------- */
function relativeTime(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime())
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* ---------- Health Status Helpers ---------- */
type HealthStatus = "connected" | "degraded" | "disconnected" | "unknown"

function healthDot(health: HealthStatus) {
  switch (health) {
    case "connected": return "bg-emerald-500"
    case "degraded": return "bg-yellow-400"
    case "disconnected": return "bg-red-500"
    default: return "bg-zinc-300"
  }
}

function healthLabel(health: HealthStatus) {
  switch (health) {
    case "connected": return "Connected"
    case "degraded": return "Degraded"
    case "disconnected": return "Disconnected"
    default: return "Unknown"
  }
}

function healthEmoji(health: HealthStatus) {
  switch (health) {
    case "connected": return "🟢"
    case "degraded": return "🟡"
    case "disconnected": return "🔴"
    default: return "⚪"
  }
}

const TROUBLESHOOTING_STEPS = [
  { num: "1", title: "Check your API key", desc: "Ensure your API key is valid and not expired. Go to Settings → Developer to verify." },
  { num: "2", title: "Verify network connectivity", desc: "Make sure you can reach api.drivemem.cloud from your machine. Try: curl https://api.drivemem.cloud/health" },
  { num: "3", title: "Restart your AI tool", desc: "Close and reopen Cursor, Claude Desktop, or your connected tool. MCP connections don't auto-reconnect." },
  { num: "4", title: "Re-run setup", desc: "Run `npx drivemem setup` again to reconfigure. This fixes most connection issues." },
]

/* ---------- Connected Agents ---------- */
function ConnectedAgents({ onAgentCountChange }: { onAgentCountChange?: (count: number) => void }) {
  const { status } = useSession()
  const isLoggedIn = status === "authenticated"
  const [agents, setAgents] = useState<{ name: string; status: string; lastActiveAt: string; disconnectedAt: string | null; totalCalls: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [logsAgent, setLogsAgent] = useState<string | null>(null)
  const [logs, setLogs] = useState<{ id: string; action: string; detail: string | null; createdAt: string }[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [healthMap, setHealthMap] = useState<Record<string, { health: HealthStatus; checkedAt: string }>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [troubleshootAgent, setTroubleshootAgent] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/users/me/connections")
      setAgents(data?.agents || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const fetchHealth = useCallback(async () => {
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/mcp/health-check")
      if (data?.agents) {
        const map: Record<string, { health: HealthStatus; checkedAt: string }> = {}
        for (const a of data.agents) {
          map[a.name] = { health: a.health, checkedAt: a.checkedAt }
        }
        setHealthMap(map)
      }
    } catch { /* ignore */ }
  }, [])

  const testConnection = useCallback(async (agentName: string) => {
    setTesting(agentName)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch(`/api/mcp/health-check?agentName=${encodeURIComponent(agentName)}`)
      setHealthMap(prev => ({ ...prev, [agentName]: { health: data?.health || "disconnected", checkedAt: data?.checkedAt || new Date().toISOString() } }))
      if (data?.health === "connected") {
        toast.success(`${agentName} is healthy!`)
      } else if (data?.health === "degraded") {
        toast.warning(`${agentName} may be degraded`)
      } else {
        toast.error(`${agentName} appears disconnected`)
        setTroubleshootAgent(agentName)
      }
    } catch {
      toast.error("Health check failed")
    } finally {
      setTesting(null)
    }
  }, [])

  useEffect(() => { if (isLoggedIn) fetchAgents() }, [isLoggedIn, fetchAgents])
  useEffect(() => { onAgentCountChange?.(agents.length) }, [agents.length, onAgentCountChange])

  // Fetch health on mount and every 60s
  useEffect(() => {
    if (!isLoggedIn || agents.length === 0) return
    fetchHealth()
    const interval = setInterval(fetchHealth, 60_000)
    return () => clearInterval(interval)
  }, [isLoggedIn, agents.length, fetchHealth])

  const handleRename = async (oldName: string) => {
    if (!renameValue.trim() || renameValue === oldName) { setRenaming(null); return }
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/users/me/agents/${encodeURIComponent(oldName)}`, { method: "PATCH", body: JSON.stringify({ newName: renameValue.trim() }) })
      toast.success("Agent renamed")
      setRenaming(null)
      fetchAgents()
    } catch { toast.error("Failed to rename") }
  }

  const handleDisconnect = async (name: string) => {
    if (!confirm(`Disconnect agent "${name}"?`)) return
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/users/me/agents/${encodeURIComponent(name)}`, { method: "DELETE" })
      toast.success("Agent disconnected")
      setMenuOpen(null)
      fetchAgents()
    } catch { toast.error("Failed to disconnect") }
  }

  const viewLogs = async (name: string) => {
    setLogsAgent(name)
    setLogsLoading(true)
    setMenuOpen(null)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch(`/api/users/me/agents/${encodeURIComponent(name)}/logs?limit=20`)
      setLogs(data?.logs || [])
    } catch { setLogs([]) }
    finally { setLogsLoading(false) }
  }

  if (!isLoggedIn) return null

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Connected Agents</h2>
        {agents.length > 0 && (
          <button onClick={fetchAgents} disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        )}
      </div>
      {loading && agents.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <RefreshCw className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <div className="text-4xl mb-3">🔌</div>
          <p className="text-sm font-medium mb-1">No agents connected yet</p>
          <p className="text-sm text-muted-foreground">Use the cards below to connect your first agent.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {agents.map((agent) => {
            const h = healthMap[agent.name]?.health || (agent.status === "online" ? "connected" : "disconnected")
            return (
            <div key={agent.name}>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <span title={`${healthEmoji(h)} ${healthLabel(h)}`} className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${healthDot(h)}`} />
              {renaming === agent.name ? (
                <form onSubmit={(e) => { e.preventDefault(); handleRename(agent.name) }} className="flex items-center gap-2 flex-1">
                  <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    className="rounded-md border px-2 py-1 text-sm flex-1 min-w-0" placeholder="New name" />
                  <Button size="sm" variant="ghost" type="submit" className="h-7 px-2 text-xs">Save</Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setRenaming(null)} className="h-7 px-2 text-xs">Cancel</Button>
                </form>
              ) : (
                <>
                  <span className="font-medium text-sm">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {agent.status === "online"
                      ? `active ${relativeTime(agent.lastActiveAt)}`
                      : `offline ${relativeTime(agent.disconnectedAt || agent.lastActiveAt)}`}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums mr-1">{agent.totalCalls} calls</span>
                  <button
                    onClick={() => testConnection(agent.name)}
                    disabled={testing === agent.name}
                    className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition disabled:opacity-50 mr-1"
                    title="Test Connection"
                  >
                    <Zap className={`h-3 w-3 ${testing === agent.name ? "animate-pulse" : ""}`} />
                    {testing === agent.name ? "Testing…" : "Test"}
                  </button>
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === agent.name ? null : agent.name)}
                      className="rounded-md p-1.5 hover:bg-muted transition">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {menuOpen === agent.name && (
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border bg-popover shadow-md py-1">
                        <button onClick={() => { setRenaming(agent.name); setRenameValue(agent.name); setMenuOpen(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition">
                          <Pencil className="h-3.5 w-3.5" /> Rename
                        </button>
                        <button onClick={() => viewLogs(agent.name)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition">
                          <ScrollText className="h-3.5 w-3.5" /> View Logs
                        </button>
                        <button onClick={() => handleDisconnect(agent.name)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-muted transition">
                          <Unplug className="h-3.5 w-3.5" /> Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Troubleshooting Panel */}
            {troubleshootAgent === agent.name && h !== "connected" && (
              <div className="px-5 pb-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">🔧 Troubleshooting Steps</h4>
                    <button onClick={() => setTroubleshootAgent(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
                  </div>
                  <div className="space-y-3">
                    {TROUBLESHOOTING_STEPS.map((step) => (
                      <div key={step.num} className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-200 shrink-0">{step.num}</div>
                        <div>
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          )})}
        </div>
      )}

      {/* Agent Logs Panel */}
      {logsAgent && (
        <div className="mt-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Logs — {logsAgent}</h3>
            <button onClick={() => setLogsAgent(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          {logsLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logs found.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-sm">
                  <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{relativeTime(log.createdAt)}</span>
                  <span className="font-medium text-xs bg-muted px-1.5 py-0.5 rounded">{log.action}</span>
                  {log.detail && <span className="text-muted-foreground text-xs truncate">{log.detail.slice(0, 80)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Connect → Value: show suggested prompts when agents are connected */}
      {agents.length > 0 && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎉</span>
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Connected! Try these prompts in your AI tool:</h3>
          </div>
          <div className="grid gap-2">
            {[
              "Summarize my recent notes and find connections between them",
              "Based on my knowledge base, what are my current priorities?",
              "Search my files for anything related to [your topic]",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => { navigator.clipboard.writeText(prompt); toast.success("Prompt copied!"); trackEvent("connect_value_prompt_copy") }}
                className="group flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-left text-sm hover:border-emerald-400 hover:shadow-sm transition"
              >
                <span className="text-muted-foreground group-hover:text-emerald-600 transition">💬</span>
                <span className="flex-1 text-zinc-700 dark:text-zinc-300">{prompt}</span>
                <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Paste any prompt above into Cursor, Claude Desktop, or your connected AI tool. DriveMem will automatically provide your knowledge as context.
          </p>
        </div>
      )}
    </div>
  )
}

/* ---------- LLM Proxy Section ---------- */
function LLMProxySection({ copied, copyText }: { copied: string | null; copyText: (text: string, label: string) => void }) {
  const proxyBaseUrl = "https://api.drivemem.cloud/proxy/v1"

  const steps = [
    {
      num: "1",
      title: "Set API Base URL",
      content: (
        <div className="mt-2">
          <div className="relative">
            <pre className="rounded-lg bg-zinc-950 text-zinc-50 px-4 py-3 text-sm font-mono select-all pr-20 overflow-x-auto">
              {proxyBaseUrl}
            </pre>
            <button
              onClick={() => copyText(proxyBaseUrl, "proxy-url")}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 text-xs font-medium transition"
            >
              {copied === "proxy-url" ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Set this as the base URL / API endpoint in your LLM client settings
          </p>
        </div>
      ),
    },
    {
      num: "2",
      title: "Use Your Own API Key",
      content: (
        <p className="text-sm text-muted-foreground mt-2">
          Your existing OpenAI or Anthropic API key works as-is — just enter it in your client. We never store your key.
        </p>
      ),
    },
    {
      num: "3",
      title: "Chat with Knowledge",
      content: (
        <p className="text-sm text-muted-foreground mt-2">
          Your DriveMem files are automatically included as context in every conversation. No extra configuration needed.
        </p>
      ),
    },
  ]

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Universal LLM Proxy</h2>
        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Use your knowledge with ChatGPT, Claude, or any LLM — just change one setting
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {steps.map((step) => (
          <div key={step.num} className="rounded-2xl border shadow-soft p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {step.num}
              </div>
              <h3 className="font-semibold text-sm">{step.title}</h3>
            </div>
            {step.content}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        🔒 Your API key passes through securely and is never stored.
      </p>
    </div>
  )
}

/* ---------- Data Sources ---------- */
function DataSources() {
  const { status } = useSession()
  const isLoggedIn = status === "authenticated"
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [oauthStatus, setOauthStatus] = useState<{ notion: boolean; github: boolean; googleDrive: boolean }>({ notion: true, github: true, googleDrive: true })

  const fetchIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/integrations")
      setIntegrations(data?.integrations || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (isLoggedIn) fetchIntegrations() }, [isLoggedIn, fetchIntegrations])

  useEffect(() => {
    import("@/lib/api").then(({ apiFetch }) =>
      apiFetch("/api/integrations/oauth-status").then((d: any) => d && setOauthStatus(d)).catch(() => {})
    )
  }, [])

  const connectNotion = async () => {
    const session = await getSession() as any
    const token = session?.accessToken || ''
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "https://api.drivemem.cloud"}/api/integrations/notion/connect?token=${token}`
  }

  const disconnectIntegration = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/integrations/${id}`, { method: "DELETE" })
      toast.success("Disconnected")
      fetchIntegrations()
    } catch { toast.error("Failed to disconnect") }
  }

  const syncNow = async (id: string) => {
    setSyncing(id)
    try {
      const { apiFetch } = await import("@/lib/api")
      const result = await apiFetch(`/api/integrations/${id}/sync`, { method: "POST" })
      toast.success(`Synced ${result?.synced || 0} pages`)
      fetchIntegrations()
    } catch { toast.error("Sync failed") }
    finally { setSyncing(null) }
  }

  if (!isLoggedIn) return null

  const notionIntegration = integrations.find((i: any) => i.provider === "notion")
  const googleDriveIntegration = integrations.find((i: any) => i.provider === "google-drive")
  const githubIntegration = integrations.find((i: any) => i.provider === "github")

  const connectGoogleDrive = async () => {
    const session = await getSession() as any
    const token = session?.accessToken || ''
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "https://api.drivemem.cloud"}/api/integrations/google-drive/connect?token=${token}`
  }

  const connectGitHub = async () => {
    const session = await getSession() as any
    const token = session?.accessToken || ''
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "https://api.drivemem.cloud"}/api/integrations/github/connect?token=${token}`
  }

  return (
    <div className="mt-10 mb-10">
      <h2 className="text-lg font-semibold tracking-tight mb-4">Data Sources</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Notion Card */}
        <div className="rounded-2xl border shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Database className="h-5 w-5 text-zinc-700" />
            </div>
            <div>
              <h3 className="font-semibold">Notion</h3>
              <p className="text-xs text-muted-foreground">Sync pages as knowledge</p>
            </div>
          </div>
          {notionIntegration ? (
            <div className="flex-1 flex flex-col gap-3">
              <div className="text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                Connected{notionIntegration.externalAccountName ? ` — ${notionIntegration.externalAccountName}` : ""}
              </div>
              {(notionIntegration.config as any)?.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {new Date((notionIntegration.config as any).lastSyncAt).toLocaleString()}
                </p>
              )}
              <div className="mt-auto flex gap-2">
                <Button size="sm" onClick={() => syncNow(notionIntegration.id)} disabled={syncing === notionIntegration.id}
                  className="flex-1 rounded-xl active:scale-[0.98]">
                  {syncing === notionIntegration.id ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</> : "Sync Now"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => disconnectIntegration(notionIntegration.id)}
                  className="rounded-xl active:scale-[0.98]">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-6 flex-1">
                Connect your Notion workspace to automatically sync pages into your knowledge base.
              </p>
              <Button onClick={connectNotion} className="w-full rounded-xl shadow-soft active:scale-[0.98]" disabled={!oauthStatus.notion}>
                {oauthStatus.notion ? "Connect Notion" : <>Connect Notion <span className="ml-2 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Coming Q3 2026</span></>}
              </Button>
            </div>
          )}
        </div>

        {/* Google Drive Card */}
        <div className="rounded-2xl border shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg">📄</div>
            <div>
              <h3 className="font-semibold">Google Drive</h3>
              <p className="text-xs text-muted-foreground">Sync documents as knowledge</p>
            </div>
          </div>
          {googleDriveIntegration ? (
            <div className="flex-1 flex flex-col gap-3">
              <div className="text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                Connected{googleDriveIntegration.externalAccountName ? ` — ${googleDriveIntegration.externalAccountName}` : ""}
              </div>
              {(googleDriveIntegration.config as any)?.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {new Date((googleDriveIntegration.config as any).lastSyncAt).toLocaleString()}
                </p>
              )}
              <div className="mt-auto flex gap-2">
                <Button size="sm" onClick={() => syncNow(googleDriveIntegration.id)} disabled={syncing === googleDriveIntegration.id}
                  className="flex-1 rounded-xl active:scale-[0.98]">
                  {syncing === googleDriveIntegration.id ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</> : "Sync Now"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => disconnectIntegration(googleDriveIntegration.id)}
                  className="rounded-xl active:scale-[0.98]">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-6 flex-1">
                Connect Google Drive to automatically sync documents, sheets, and PDFs into your knowledge base.
              </p>
              <Button onClick={connectGoogleDrive} className="w-full rounded-xl shadow-soft active:scale-[0.98]" disabled={!oauthStatus.googleDrive}>
                {oauthStatus.googleDrive ? "Connect Google Drive" : <>Connect Google Drive <span className="ml-2 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Coming Q3 2026</span></>}
              </Button>
            </div>
          )}
        </div>

        {/* GitHub Card */}
        <div className="rounded-2xl border shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg">🐙</div>
            <div>
              <h3 className="font-semibold">GitHub</h3>
              <p className="text-xs text-muted-foreground">Sync repos as knowledge</p>
            </div>
          </div>
          {githubIntegration ? (
            <div className="flex-1 flex flex-col gap-3">
              <div className="text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                Connected{githubIntegration.externalAccountName ? ` — @${githubIntegration.externalAccountName}` : ""}
              </div>
              {(githubIntegration.config as any)?.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {new Date((githubIntegration.config as any).lastSyncAt).toLocaleString()}
                </p>
              )}
              <div className="mt-auto flex gap-2">
                <Button size="sm" onClick={() => syncNow(githubIntegration.id)} disabled={syncing === githubIntegration.id}
                  className="flex-1 rounded-xl active:scale-[0.98]">
                  {syncing === githubIntegration.id ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</> : "Sync Now"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => disconnectIntegration(githubIntegration.id)}
                  className="rounded-xl active:scale-[0.98]">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-6 flex-1">
                Connect GitHub to sync repository contents, issues, and markdown files into your knowledge base.
              </p>
              <Button onClick={connectGitHub} className="w-full rounded-xl shadow-soft active:scale-[0.98]" disabled={!oauthStatus.github}>
                {oauthStatus.github ? "Connect GitHub" : <>Connect GitHub <span className="ml-2 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Coming Q3 2026</span></>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Empty KB Warning ---------- */
function EmptyKBWarning() {
  const { status } = useSession()
  const [fileCount, setFileCount] = useState<number | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    import("@/lib/api").then(({ apiFetch }) =>
      apiFetch("/api/v1/files?limit=1").then((d: any) => setFileCount(d?.total ?? d?.files?.length ?? null)).catch(() => {})
    )
  }, [status])

  if (fileCount === null || fileCount > 0) return null

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📂</span>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Upload files first for the best experience</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Your knowledge base is empty. Connect works best when your AI tools have knowledge to draw from.
      </p>
      <Link href="/files" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 transition">
        Upload your first file →
      </Link>
    </div>
  )
}

export default function ConnectPage() {
  useEffect(() => { document.title = "Connect — DriveMem" }, [])
  const [copied, setCopied] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [agentCount, setAgentCount] = useState(0)

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(label)
    toast.success("Copied!")
    trackEvent("connect_mcp", { method: label })
    setTimeout(() => setCopied(null), 2000)
  }

  const mcpUrl = "https://api.drivemem.cloud/mcp?apiKey=YOUR_API_KEY"
  const claudeConfig = JSON.stringify({
    mcpServers: {
      drivemem: {
        command: "npx",
        args: ["-y", "drivemem", "mcp"]
      }
    }
  }, null, 2)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Connect your agents</h1>
      <p className="text-muted-foreground mt-2 mb-8">Pick your tool and connect in under 2 minutes</p>

      <ConnectedAgents onAgentCountChange={(c) => setAgentCount(c)} />
      <EmptyKBWarning />

      {/* Quick Setup — always visible */}
      <div className="mb-10 rounded-2xl border-2 border-primary/20 bg-primary/[0.03] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">One Command Setup</h2>
        </div>
        <p className="text-muted-foreground mb-5 ml-[52px]">Automatically configure Cursor, Claude Desktop, and more</p>
        <div className="relative ml-[52px] max-w-lg">
          <pre className="rounded-xl bg-zinc-950 text-zinc-50 px-5 py-4 text-sm font-mono select-all">npx drivemem setup</pre>
          <Button
            size="sm"
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg h-8 px-3"
            onClick={() => copyText("npx drivemem setup", "quick-setup")}
          >
            {copied === "quick-setup" ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 ml-[52px]">
          Requires Node.js 18+. You'll need your API Key — <Link href="/settings?tab=developer" className="text-primary font-medium hover:underline">get it from Settings → Developer</Link>
        </p>

      </div>

      {/* Manual Setup (collapsible) */}
      <div className="mb-10">
        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          {showManual ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Manual Setup
          <span className="text-xs font-normal ml-1">— configure each tool individually</span>
        </button>
        {showManual && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Cursor Card */}
        <div className="rounded-2xl border shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Monitor className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Cursor</h3>
              <p className="text-xs text-muted-foreground">AI code editor</p>
            </div>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 mb-6 flex-1">
            <li>1. Open Cursor → Settings → MCP</li>
            <li>2. Click <strong>Add Server</strong>, paste the URL below</li>
            <li>3. <strong>Reload Window</strong> (Cmd+Shift+P → Reload)</li>
            <li>4. Start a new chat — DriveMem tools are ready!</li>
            <li className="mt-2 pt-2 border-t border-dashed">
              <strong>Pro tip:</strong> Add a{' '}
              <a href="/cursorrules.txt" download=".cursorrules" className="text-primary underline">
                .cursorrules file
              </a>{' '}
              to your project for auto-context loading
            </li>
          </ol>
          <Button
            onClick={() => copyText(mcpUrl, "cursor")}
            className="w-full rounded-xl shadow-soft active:scale-[0.98]"
          >
            {copied === "cursor" ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy Connection URL</>}
          </Button>
        </div>

        {/* Claude Desktop Card */}
        <div className="rounded-2xl border shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Puzzle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold">Claude Desktop</h3>
              <p className="text-xs text-muted-foreground">Anthropic&apos;s AI assistant</p>
            </div>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 mb-6 flex-1">
            <li>1. Open your Claude config file</li>
            <li className="text-xs">Mac: ~/Library/Application Support/Claude/claude_desktop_config.json</li>
            <li>2. Paste the config below</li>
            <li>3. Restart Claude Desktop</li>
          </ol>
          <Button
            onClick={() => copyText(claudeConfig, "claude")}
            className="w-full rounded-xl shadow-soft active:scale-[0.98]"
          >
            {copied === "claude" ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy Configuration</>}
          </Button>
        </div>

        {/* Browser Extension Card */}
        <div className="rounded-2xl border shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Globe className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">ChatGPT & more</h3>
              <p className="text-xs text-muted-foreground">Browser extension</p>
            </div>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 mb-6 flex-1">
            <li>1. Install the browser extension</li>
            <li>2. Done — works automatically</li>
          </ol>
          <Button
            variant="outline"
            className="w-full rounded-xl shadow-soft opacity-60 cursor-not-allowed"
            disabled
          >
            Install Extension <span className="ml-2 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded-full">Coming Soon</span>
          </Button>
        </div>
        {/* Any App (Webhook) Card */}
        <div className="rounded-2xl border shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Webhook className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Any App</h3>
              <p className="text-xs text-muted-foreground">Zapier / Make / n8n / custom</p>
            </div>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 mb-6 flex-1">
            <li>1. Copy the webhook URL below</li>
            <li>2. Add it in Zapier, Make, n8n, or any HTTP tool</li>
            <li>3. POST JSON with <code className="bg-muted px-1 py-0.5 rounded text-xs">content</code> field</li>
          </ol>
          <Button
            onClick={() => copyText("https://api.drivemem.cloud/api/v1/inbound/webhook", "webhook")}
            className="w-full rounded-xl shadow-soft active:scale-[0.98]"
          >
            {copied === "webhook" ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy Webhook URL</>}
          </Button>
        </div>
      </div>
        )}
      </div>

      {/* LLM Proxy */}
      <LLMProxySection copied={copied} copyText={copyText} />

      {/* Data Sources */}
      <DataSources />

      {/* Advanced section */}
      <div className="mt-12">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          Advanced options
        </button>
        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/settings?tab=developer" className="rounded-xl border p-4 hover:shadow-sm transition-all active:scale-[0.98]">
              <Key className="h-5 w-5 text-muted-foreground mb-2" />
              <h4 className="font-medium text-sm">API Keys</h4>
              <p className="text-xs text-muted-foreground mt-1">Create and manage API keys</p>
            </Link>
            <Link href="/settings?tab=developer" className="rounded-xl border p-4 hover:shadow-sm transition-all active:scale-[0.98]">
              <Users className="h-5 w-5 text-muted-foreground mb-2" />
              <h4 className="font-medium text-sm">Agent Profiles</h4>
              <p className="text-xs text-muted-foreground mt-1">Configure role-based delivery</p>
            </Link>
            <Link href="/settings?tab=developer" className="rounded-xl border p-4 hover:shadow-sm transition-all active:scale-[0.98]">
              <Bell className="h-5 w-5 text-muted-foreground mb-2" />
              <h4 className="font-medium text-sm">Webhooks</h4>
              <p className="text-xs text-muted-foreground mt-1">Subscribe to knowledge changes</p>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
