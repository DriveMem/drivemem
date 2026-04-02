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

    toast("AI 已记住你的文件！", {
      description: "试试问它点什么——比如总结内容、提取要点。",
      duration: 8000,
      action: {
        label: "去对话",
        onClick: () => {
          router.push("/chat?q=" + encodeURIComponent("总结一下这个文件的内容"))
        },
      },
    })
  }, [hasIndexedFile, pathname, router])

  return null
}
