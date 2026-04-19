import { useState, useCallback } from 'react'

const PRODUCTION_API = "https://api.drivemem.cloud"
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
const API_BASE = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ fileId: string; fileName: string; chunkIndex: number; text: string }>
}

export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setError(null)

    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.status === 429) {
        setError('Daily conversation limit reached. Please try again tomorrow')
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        setIsStreaming(false)
        return
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) throw new Error('No reader')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim()
            // Next line should be data:
            continue
          }
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            // Determine event type from previous event line or infer
            if (data.content !== undefined) {
              // token event
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: m.content + data.content } : m)
              )
            } else if (data.messageId) {
              // done event
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, id: data.messageId, citations: data.citations } : m)
              )
            } else if (data.code) {
              // error event
              setError(data.message || 'Generation failed')
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setIsStreaming(false)
    }
  }, [conversationId])

  return { messages, isStreaming, error, sendMessage, setMessages }
}
