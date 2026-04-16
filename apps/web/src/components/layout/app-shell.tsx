"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useLayoutStore } from "@/stores/layout-store"
import { Sidebar } from "./sidebar"
import { InspectorPanel } from "./inspector-panel"
import { TopNav } from "./top-nav"
import { CommandPalette } from "./command-palette"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { OfflineBanner } from "@/hooks/use-network-status"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, inspectorOpen, mobileSidebarOpen, setMobileSidebarOpen } = useLayoutStore()
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Background constellation glow */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{ background: 'radial-gradient(circle at 70% 30%, rgba(94,106,210,0.15) 0%, transparent 50%)' }}
      />

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:block flex-shrink-0 border-r border-white/[0.06] overflow-hidden bg-[#0A0E1A]"
      >
        <Sidebar />
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-[#0A0E1A]">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden relative z-[1]">
        <TopNav />
        <motion.main
          className="flex-1 overflow-auto"
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
            className="flex-shrink-0 border-l border-white/[0.06] overflow-hidden"
          >
            <InspectorPanel />
          </motion.aside>
        )}
      </AnimatePresence>
      <CommandPalette />
      <FeedbackButton />
      <OfflineBanner />
    </div>
  )
}
