import { AppShell } from "@/components/layout/app-shell"
import { ErrorBoundary } from "@/components/ui/full-page-error"
import { CommandPalette } from "@/components/command-palette"
import { NetworkErrorBanner } from "@/components/ui/network-error-banner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <NetworkErrorBanner />
      <CommandPalette />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AppShell>
  )
}
