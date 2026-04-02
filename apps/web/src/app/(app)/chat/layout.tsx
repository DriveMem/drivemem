"use client"

import { ConversationList } from "@/components/chat/conversation-list"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <div className="hidden w-64 shrink-0 md:block">
        <ConversationList />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
