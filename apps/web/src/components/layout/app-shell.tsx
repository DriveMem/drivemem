"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useLayoutStore } from "@/stores/layout-store"
import { Sidebar } from "./sidebar"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { InspectorPanel } from "./inspector-panel"
import { TopNav } from "./top-nav"
import { CommandPalette } from "./command-palette"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { OfflineBanner } from "@/hooks/use-network-status"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, inspectorOpen, mobileSidebarOpen, setMobileSidebarOpen } = useLayoutStore()
  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:block flex-shrink-0 border-r border-border overflow-hidden bg-zinc-50 dark:bg-zinc-900"
      >
        <Sidebar />
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-zinc-50 dark:bg-zinc-900">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <motion.main
          className="flex-1 overflow-auto pb-16 md:pb-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </div>
      <AnimatePresence>
        {inspectorOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-shrink-0 border-l border-border overflow-hidden"
          >
            <InspectorPanel />
          </motion.aside>
        )}
      </AnimatePresence>
      {/* S2: Mobile bottom tab bar — visible only ≤768px */}
      <MobileBottomNav />
      <CommandPalette />
      <FeedbackButton />
      <OnboardingFlow />
      <OfflineBanner />
    </div>
  )
}
