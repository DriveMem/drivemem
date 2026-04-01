"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useLayoutStore } from "@/stores/layout-store"
import { Sidebar } from "./sidebar"
import { InspectorPanel } from "./inspector-panel"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, inspectorOpen } = useLayoutStore()
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-shrink-0 border-r border-border overflow-hidden"
      >
        <Sidebar />
      </motion.aside>
      <main className="flex-1 overflow-auto">{children}</main>
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
    </div>
  )
}
