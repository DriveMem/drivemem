import { AppShell } from "@/components/layout/app-shell"
import { ErrorBoundary } from "@/components/ui/full-page-error"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AppShell>
  )
}
