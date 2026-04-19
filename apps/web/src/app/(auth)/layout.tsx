import { Brain, ArrowLeftRight, Zap } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Persistent Memory",
    description: "All agents share one persistent memory layer",
  },
  {
    icon: ArrowLeftRight,
    title: "Cross-Agent Context",
    description: "Seamless context handoff between agents",
  },
  {
    icon: Zap,
    title: "MCP / API Integration",
    description: "Connect any AI agent with one line of config",
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - light themed to match Landing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <h1 className="text-5xl font-bold text-foreground mb-3">
            DriveMem
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Memory for your AI agents
          </p>

          <div className="space-y-6 max-w-sm">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <feature.icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-foreground font-medium text-sm">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
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
