import { AppShell } from "@/components/layout/app-shell"
import { ErrorBoundary } from "@/components/ui/full-page-error"
import { CommandPalette } from "@/components/command-palette"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <CommandPalette />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AppShell>
  )
}
