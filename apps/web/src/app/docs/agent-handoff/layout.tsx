import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Agent Handoff — DriveMem Docs",
}

export default function AgentHandoffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
