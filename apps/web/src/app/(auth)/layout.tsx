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

          <p className="mt-16 text-xs text-muted-foreground/60">
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
