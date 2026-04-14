"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { MessageSquare } from "lucide-react"

const STORAGE_KEY = "ai-drive:first-upload-done"

export function FirstUploadGuide({ hasIndexedFile }: { hasIndexedFile: boolean }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hasIndexedFile || pathname?.startsWith("/chat")) return
    if (localStorage.getItem(STORAGE_KEY)) return

    localStorage.setItem(STORAGE_KEY, "1")

    toast("AI Remembered your files!", {
      description: "Try asking something — like summarizing content or extracting key points.",
      duration: 8000,
      action: {
        label: "Go to chat",
        onClick: () => {
          router.push("/chat?q=" + encodeURIComponent("Summarize the content of this file"))
        },
      },
    })
  }, [hasIndexedFile, pathname, router])

  return null
}
