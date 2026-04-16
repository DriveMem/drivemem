import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Home — DriveMem",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
