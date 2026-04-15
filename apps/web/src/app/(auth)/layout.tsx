import { Link, RefreshCw, Zap } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Brand radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <h1 className="text-5xl font-bold text-white mb-3">DriveMem</h1>
          <p className="text-lg text-zinc-400 mb-12">Agent&apos;s memory layer</p>

          <div className="space-y-6 max-w-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <Link className="h-4 w-4 text-zinc-300" />
              </div>
              <div>
                <p className="text-zinc-200 font-medium">Agent Memory layer</p>
                <p className="text-sm text-zinc-500">All agents share one persistent memory</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <RefreshCw className="h-4 w-4 text-zinc-300" />
              </div>
              <div>
                <p className="text-zinc-200 font-medium">Cross-agent context</p>
                <p className="text-sm text-zinc-500">Context Packet Seamless task handoff</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <Zap className="h-4 w-4 text-zinc-300" />
              </div>
              <div>
                <p className="text-zinc-200 font-medium">MCP / API Integration</p>
                <p className="text-sm text-zinc-500">Connect any AI Agent with one line of configuration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
