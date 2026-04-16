import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Connect — DriveMem",
  description: "Connect your AI agents to DriveMem. REST API, MCP protocol, CLI, SDKs, and webhooks.",
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
