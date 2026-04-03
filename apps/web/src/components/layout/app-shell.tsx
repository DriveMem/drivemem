"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useLayoutStore } from "@/stores/layout-store"
import { Sidebar } from "./sidebar"
import { InspectorPanel } from "./inspector-panel"
export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, inspectorOpen, mobileMenuOpen, setMobileMenuOpen, mobileInspectorOpen, setMobileInspectorOpen } = useLayoutStore()
  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <motion.aside initial={false} animate={{ width: sidebarCollapsed ? 64 : 240 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="hidden md:block flex-shrink-0 border-r border-border overflow-hidden"><Sidebar /></motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-y-0 left-0 z-50 w-60 bg-background border-r border-border md:hidden overflow-auto"><Sidebar /></motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>

      {/* Desktop inspector */}
      <AnimatePresence>{inspectorOpen && (
        <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 360, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="hidden md:block flex-shrink-0 border-l border-border overflow-hidden"><InspectorPanel /></motion.aside>
      )}</AnimatePresence>

      {/* Mobile inspector overlay */}
      <AnimatePresence>
        {mobileInspectorOpen && inspectorOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black md:hidden" onClick={() => setMobileInspectorOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-x-0 bottom-0 z-50 h-[80vh] bg-background border-t border-border rounded-t-xl md:hidden overflow-auto">
              <InspectorPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
