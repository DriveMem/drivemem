"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { FileText, Clock, Loader2, MessageSquare, Lightbulb } from "lucide-react"
import Link from "next/link"

function EventCard({ event }: { event: any }) {
  if (event._type === "file") {
    return (
      <Link href={`/files/${event.id}/preview`} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition">
        <div className="rounded-lg bg-blue-500/10 p-2"><FileText className="h-4 w-4 text-blue-500" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{event.name || event.originalName}</p>
          {event.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.summary}</p>}
          <p className="text-xs text-muted-foreground/50 mt-1">📄 上传文件</p>
        </div>
      </Link>
    )
  }

  if (event._type === "conversation") {
    return (
      <Link href={`/chat/${event.id}`} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition">
        <div className="rounded-lg bg-green-500/10 p-2"><MessageSquare className="h-4 w-4 text-green-500" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{event.title || "AI 对话"}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">💬 AI 对话</p>
        </div>
      </Link>
    )
  }

  if (event._type === "insight") {
    return (
      <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition">
        <div className="rounded-lg bg-purple-500/10 p-2"><Lightbulb className="h-4 w-4 text-purple-500" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{event.title || "AI 洞察"}</p>
          {event.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>}
          <p className="text-xs text-muted-foreground/50 mt-1">💡 知识发现</p>
        </div>
      </div>
    )
  }

  return null
}

export default function TimelinePage() {
  useEffect(() => { document.title = "知识活动 - AI Drive" }, [])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch("/api/files"),
      apiFetch("/api/conversations"),
      apiFetch("/api/insights"),
    ]).then(([filesData, convsData, insightsData]) => {
      const files = (Array.isArray(filesData) ? filesData : filesData?.files || []).map((f: any) => ({ ...f, _type: "file" }))
      const convs = (Array.isArray(convsData) ? convsData : convsData?.conversations || []).map((c: any) => ({ ...c, _type: "conversation", createdAt: c.updatedAt || c.createdAt }))
      const insights = (Array.isArray(insightsData) ? insightsData : insightsData?.insights || []).map((i: any) => ({ ...i, _type: "insight" }))

      const all = [...files, ...convs, ...insights].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setEvents(all)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Group by date
  const groups: Record<string, any[]> = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  events.forEach(e => {
    const d = new Date(e.createdAt).toDateString()
    const label = d === today ? "今天" : d === yesterday ? "昨天" : new Date(e.createdAt).toLocaleDateString("zh-CN")
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">📅 知识活动</h1>
      <p className="text-sm text-muted-foreground mb-8">你的 AI 知识积累过程</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : Object.entries(groups).length === 0 ? (
        <p className="text-center text-muted-foreground py-12">开始使用 AI Drive，你的知识活动将显示在这里</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-4">{date}</h2>
              <div className="border-l-2 border-border pl-6 space-y-4">
                {items.map((e: any) => (
                  <div key={e.id} className="relative">
                    <div className={`absolute -left-[1.625rem] top-3 h-3 w-3 rounded-full ring-4 ring-background ${
                      e._type === "file" ? "bg-blue-500" : e._type === "conversation" ? "bg-green-500" : "bg-purple-500"
                    }`} />
                    <EventCard event={e} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
