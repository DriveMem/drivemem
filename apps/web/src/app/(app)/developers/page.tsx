"use client"
import { useState } from "react"
import { useEffect } from "react"
import Link from "next/link"
import { Copy, Check, Monitor, Globe, Puzzle, ChevronDown, Key, Users, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function ConnectPage() {
  useEffect(() => { document.title = "Connect — DriveMem" }, [])
  const [copied, setCopied] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(label)
    toast.success("Copied!")
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
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Connect your agents</h1>
      <p className="text-muted-foreground mt-2 mb-8">Pick your tool and connect in under 2 minutes</p>

      <div className="grid md:grid-cols-3 gap-6">
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
            <li>2. Click <strong>Add Server</strong></li>
            <li>3. Paste the URL below</li>
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
            className="w-full rounded-xl shadow-soft active:scale-[0.98]"
            asChild
          >
            <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener">Install Extension</a>
          </Button>
        </div>
      </div>

      {/* API Key note */}
      <p className="text-sm text-muted-foreground mt-6 text-center">
        Replace <code className="bg-muted px-1.5 py-0.5 rounded text-xs">YOUR_API_KEY</code> with your key from{" "}
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
          <div className="mt-4 grid md:grid-cols-3 gap-4">
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
