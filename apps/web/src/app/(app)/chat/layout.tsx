"use client"
import { ChatSidebar } from "@/components/chat/chat-sidebar"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <ChatSidebar />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
