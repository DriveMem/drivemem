"use client"
import { useState, useEffect } from "react"
import { Tag } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { useLayoutStore } from "@/stores/layout-store"

export function TagList() {
  const [tags, setTags] = useState<any[]>([])
  const { activeTagFilter, setActiveTagFilter } = useLayoutStore()

  useEffect(() => {
    apiFetch("/api/tags").then((data: any) => setTags(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  if (tags.length === 0) return (
    <div className="border-t border-border p-2">
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground">标签</p>
      <button
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 transition cursor-default"
        title="在文件列表中右键点击文件即可创建和分配标签"
      >
        <Tag className="h-3 w-3 shrink-0" />
        <span className="truncate text-xs">右键文件创建第一个标签</span>
      </button>
    </div>
  )

  return (
    <div className="border-t border-border p-2">
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground">标签</p>
      {tags.map((tag: any) => (
        <button
          key={tag.id}
          onClick={() => setActiveTagFilter(activeTagFilter === tag.name ? null : tag.name)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
            activeTagFilter === tag.name ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#6B7280' }} />
          <span className="truncate">{tag.name}</span>
        </button>
      ))}
    </div>
  )
}
