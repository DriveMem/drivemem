import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Team Workspace — DriveMem Docs",
}

export default function TeamWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
