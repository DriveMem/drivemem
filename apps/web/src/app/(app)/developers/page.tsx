"use client"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Copy, Check, Monitor, Globe, Puzzle, ChevronDown, ChevronRight, Key, Users, Bell, RefreshCw, Webhook, Database, Terminal } from "lucide-react"
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

/* ---------- Connected Agents ---------- */
function ConnectedAgents() {
  const { status } = useSession()
  const isLoggedIn = status === "authenticated"
  const [agents, setAgents] = useState<{ name: string; status: string; lastActiveAt: string; disconnectedAt: string | null; totalCalls: number }[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/users/me/connections")
      setAgents(data?.agents || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (isLoggedIn) fetchAgents() }, [isLoggedIn, fetchAgents])

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
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-3 px-5 py-3.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${agent.status === "online" ? "bg-emerald-500" : "bg-zinc-300"}`} />
              <span className="font-medium text-sm">{agent.name}</span>
              <span className="text-xs text-muted-foreground">
                {agent.status === "online"
                  ? `active ${relativeTime(agent.lastActiveAt)}`
                  : `offline ${agent.disconnectedAt ? `since ${relativeTime(agent.disconnectedAt)}` : relativeTime(agent.lastActiveAt)}`}
              </span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{agent.totalCalls} calls</span>
            </div>
          ))}
        </div>
      )}
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

  const connectNotion = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "https://api.drivemem.cloud"}/api/integrations/notion/connect`
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

  const connectGoogleDrive = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "https://api.drivemem.cloud"}/api/integrations/google-drive/connect`
  }

  const connectGitHub = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "https://api.drivemem.cloud"}/api/integrations/github/connect`
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
              <Button onClick={connectNotion} className="w-full rounded-xl shadow-soft active:scale-[0.98]">
                Connect Notion
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
              <Button onClick={connectGoogleDrive} className="w-full rounded-xl shadow-soft active:scale-[0.98]">
                Connect Google Drive
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
              <Button onClick={connectGitHub} className="w-full rounded-xl shadow-soft active:scale-[0.98]">
                Connect GitHub
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConnectPage() {
  useEffect(() => { document.title = "Connect — DriveMem" }, [])
  const [copied, setCopied] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showManual, setShowManual] = useState(false)

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
        args: ["-y", "mcp-remote", mcpUrl]
      }
    }
  }, null, 2)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Connect your agents</h1>
      <p className="text-muted-foreground mt-2 mb-8">Pick your tool and connect in under 2 minutes</p>

      <ConnectedAgents />

      {/* Quick Setup */}
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
          Requires Node.js 18+. The CLI will detect your installed tools and configure them automatically.
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

      {/* Data Sources */}
      <DataSources />

      {/* API Key note */}
      <p className="text-sm text-muted-foreground mt-6 text-center">
        Get your API key from{" "}
        <Link href="/settings?tab=developer" className="text-primary hover:underline">Settings → Developer</Link>
      </p>

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
