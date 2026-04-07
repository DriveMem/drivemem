"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface FileItem {
  id: string
  name: string
  type: string
  size: number
  parseStatus: "parsing" | "done" | "error"
  [key: string]: unknown
}

const TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  md: "📝",
  txt: "📃",
  image: "🖼️",
}

const STATUS_LABEL: Record<string, string> = {
  parsing: "解析中…",
  done: "已就绪",
  error: "解析失败",
}

type ViewMode = "list" | "grid"

export function FileGrid({ files = [] }: { files?: FileItem[] }) {
  const [view, setView] = useState<ViewMode>("grid")

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>列表</Button>
        <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}>网格</Button>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <Link key={f.id} href={`/files/${f.id}/preview`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <span className="text-3xl">{TYPE_ICONS[f.type] || "📄"}</span>
                  <p className="truncate text-sm font-medium w-full">{f.name}</p>
                  <span className={`text-xs ${f.parseStatus === "error" ? "text-destructive" : f.parseStatus === "parsing" ? "text-yellow-600" : "text-muted-foreground"}`}>
                    {STATUS_LABEL[f.parseStatus] || f.parseStatus}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="divide-y rounded border">
          {files.map((f) => (
            <li key={f.id}>
              <Link href={`/files/${f.id}/preview`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors duration-150">
                <span className="text-xl">{TYPE_ICONS[f.type] || "📄"}</span>
                <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
                <span className={`text-xs ${f.parseStatus === "error" ? "text-destructive" : f.parseStatus === "parsing" ? "text-yellow-600" : "text-muted-foreground"}`}>
                  {STATUS_LABEL[f.parseStatus] || f.parseStatus}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
