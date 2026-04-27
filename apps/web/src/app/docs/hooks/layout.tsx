import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Claude Code Hooks — DriveMem Docs",
  description: "Automatically capture knowledge from every Claude Code session with DriveMem hooks.",
}

export default function HooksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
