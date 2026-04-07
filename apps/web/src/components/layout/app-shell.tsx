"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useLayoutStore } from "@/stores/layout-store"
import { Sidebar } from "./sidebar"
import { InspectorPanel } from "./inspector-panel"
import { TopNav } from "./top-nav"
import { CommandPalette } from "./command-palette"
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal"
import { FeedbackButton } from "@/components/feedback/feedback-button"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, inspectorOpen } = useLayoutStore()
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-shrink-0 border-r border-border overflow-hidden bg-[#F8F7F5] dark:bg-[#252525]"
      >
        <Sidebar />
      </motion.aside>
      <div className="flex-1 flex flex-col overflow-hidden">
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
            className="flex-shrink-0 border-l border-border overflow-hidden"
          >
            <InspectorPanel />
          </motion.aside>
        )}
      </AnimatePresence>
      <CommandPalette />
      <KeyboardShortcutsModal />
      <FeedbackButton />
    </div>
  )
}
