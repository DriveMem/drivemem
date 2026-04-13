export const metadata = { title: "AI 对话 - DriveMem" }

import { ChatView } from "@/components/chat/chat-view"
export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  // In Next.js 15, params is a Promise in server components
  // But since ChatView is client, we pass id as prop
  return <ChatViewWrapper paramsPromise={params} />
}
async function ChatViewWrapper({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  const { id } = await paramsPromise
  return <ChatView conversationId={id} />
}
