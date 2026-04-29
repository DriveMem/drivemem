"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import Link from "next/link"
import { FileText } from "lucide-react"

interface CitedFile {
  fileId: string
  fileName: string
  citationCount: number
  lastCitedAt: string
}

export function MostReferencedPanel() {
  const [files, setFiles] = useState<CitedFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/citations/top")
      .then((res: any) => {
        const filtered = (res.topReferenced || []).filter((f: CitedFile) =>
          !/(e2e|test|sample|demo|中文测试)/i.test(f.fileName)
        )
        setFiles(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || files.length === 0) return null

  return (
    <div>
      <h2 className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-4">
        📊 Most Referenced Knowledge
      </h2>
      <div className="space-y-2">
        {files.map((f) => (
          <Link
            key={f.fileId}
            href={`/files/${f.fileId}`}
            className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                {f.fileName}
              </span>
            </div>
            <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full shrink-0 ml-2">
              {f.citationCount} refs
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
