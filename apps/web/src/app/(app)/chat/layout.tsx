"use client"

import { ConversationList } from "@/components/chat/conversation-list"
import { CitationPanel } from "@/components/chat/citation-panel"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-border/50 bg-muted/30 overflow-y-auto md:block shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)]">
        <ConversationList />
      </aside>
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
      <CitationPanel />
    </div>
  )
}
