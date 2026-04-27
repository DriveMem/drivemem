import { Brain, Plug, Zap } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "One memory across all your AI agents",
    description: "Every agent shares the same persistent knowledge layer — no more lost context",
  },
  {
    icon: Plug,
    title: "Works with Claude, Cursor, Windsurf & more",
    description: "Connect any MCP-compatible AI tool with a single config line",
  },
  {
    icon: Zap,
    title: "Set up in 2 minutes, no config needed",
    description: "Install, connect, and start remembering — it just works",
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-50 dark:bg-zinc-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <h1 className="text-5xl font-bold text-foreground mb-3">
            DriveMem
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Memory for your AI agents
          </p>

          <div className="space-y-8 max-w-sm">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-foreground font-medium text-sm">{feature.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3 max-w-sm">
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Encrypted at rest
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <svg className="w-3.5 h-3.5 text-brand-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Open source
            </span>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/60">
            Free to start · No credit card required
          </p>
        </div>
      </div>

      {/* Right panel - clean form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white dark:bg-zinc-950 px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
