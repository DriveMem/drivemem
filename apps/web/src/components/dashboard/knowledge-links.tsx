"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

interface KnowledgeLink {
  id: string
  fileAId: string
  fileBId: string
  fileAName: string
  fileBName: string
  relationType: "similar" | "complementary" | "contradictory"
  description: string
  createdAt: string
}

const relationIcons: Record<string, string> = {
  similar: "🔗",
  complementary: "🤝",
  contradictory: "⚡",
}

export function KnowledgeLinks() {
  const [links, setLinks] = useState<KnowledgeLink[]>([])

  useEffect(() => {
    apiFetch("/api/users/me/knowledge-links", { silent: true })
      .then((data: { links: KnowledgeLink[] }) => {
        if (data?.links?.length) setLinks(data.links)
      })
      .catch(() => {})
  }, [])

  if (links.length === 0) return null

  return (
    <div className="mx-4 mb-4 rounded-xl border p-4">
      <h3 className="font-semibold mb-3">🔗 AI-discovered knowledge connections</h3>
      <div className="space-y-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition"
          >
            <span className="text-sm">
              {relationIcons[link.relationType] || "🔗"}{" "}
              {link.fileAName} and {link.fileBName} — {link.description}
            </span>
            <Link
              href={`/chat?q=Compare "${link.fileAName}" and "${link.fileBName}"&mode=compare&fileA=${link.fileAId}&fileB=${link.fileBId}`}
              className="shrink-0 ml-3 text-xs text-indigo-500 hover:underline"
            >
              Compare
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
