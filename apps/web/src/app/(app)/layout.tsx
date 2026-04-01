import { AppShell } from "@/components/layout/app-shell"
import { TopNav } from "@/components/layout/top-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <div className="flex-1 overflow-hidden">
        <AppShell>{children}</AppShell>
      </div>
    </div>
  )
}
