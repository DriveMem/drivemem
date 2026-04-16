import { Brain, ArrowLeftRight, Zap } from "lucide-react"

// Pre-generate constellation dots (deterministic for SSR)
const constellationDots = [
  { x: 12, y: 8, delay: 0, duration: 18 },
  { x: 85, y: 15, delay: 1.2, duration: 22 },
  { x: 45, y: 22, delay: 0.5, duration: 16 },
  { x: 72, y: 35, delay: 2.1, duration: 20 },
  { x: 20, y: 42, delay: 3.0, duration: 19 },
  { x: 58, y: 50, delay: 0.8, duration: 24 },
  { x: 30, y: 60, delay: 1.5, duration: 17 },
  { x: 90, y: 55, delay: 2.5, duration: 21 },
  { x: 8, y: 70, delay: 0.3, duration: 23 },
  { x: 65, y: 72, delay: 1.8, duration: 18 },
  { x: 42, y: 80, delay: 3.5, duration: 20 },
  { x: 78, y: 85, delay: 0.7, duration: 16 },
  { x: 15, y: 90, delay: 2.8, duration: 22 },
  { x: 55, y: 95, delay: 1.0, duration: 19 },
  { x: 35, y: 12, delay: 4.0, duration: 21 },
  { x: 92, y: 40, delay: 2.3, duration: 17 },
  { x: 5, y: 30, delay: 3.8, duration: 25 },
  { x: 50, y: 65, delay: 1.3, duration: 20 },
]

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
      {/* Left panel - cinematic dark, desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: "#050506" }}>
        {/* Constellation dots */}
        {constellationDots.map((dot, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              animation: `authFloat ${dot.duration}s ease-in-out ${dot.delay}s infinite alternate`,
            }}
          />
        ))}

        {/* Ambient brand glow */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-500/8 blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <h1 className="text-5xl text-white mb-3 font-serif">
            DriveMem
          </h1>
          <p className="text-lg text-zinc-400 font-light mb-14">
            Memory for your AI agents
          </p>

          <div className="space-y-7 max-w-sm">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <feature.icon className="w-5 h-5 text-zinc-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-white font-medium text-sm">{feature.title}</p>
                  <p className="text-sm text-zinc-500">{feature.description}</p>
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

      {/* Keyframe for constellation animation */}
      <style>{`
        @keyframes authFloat {
          0% { transform: translate(0, 0); opacity: 0.15; }
          100% { transform: translate(20px, -15px); opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}
