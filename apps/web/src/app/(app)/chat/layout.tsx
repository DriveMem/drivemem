"use client"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { useLayoutStore } from "@/stores/layout-store"
import { motion, AnimatePresence } from "framer-motion"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { mobileChatSidebarOpen, setMobileChatSidebarOpen } = useLayoutStore()
  return (
    <div className="flex h-full">
      {/* Desktop chat sidebar */}
      <div className="hidden md:block">
        <ChatSidebar />
      </div>

      {/* Mobile chat sidebar overlay */}
      <AnimatePresence>
        {mobileChatSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black md:hidden" onClick={() => setMobileChatSidebarOpen(false)} />
            <motion.div initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-y-0 left-0 z-50 md:hidden">
              <ChatSidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden min-w-0">{children}</div>
    </div>
  )
}
