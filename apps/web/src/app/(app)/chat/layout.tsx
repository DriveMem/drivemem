"use client"

import { ConversationList } from "@/components/chat/conversation-list"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-[#0F1318] overflow-y-auto md:block">
        <ConversationList />
      </aside>
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  )
}
