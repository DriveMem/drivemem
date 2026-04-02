"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare, Sparkles } from "lucide-react"

const STORAGE_KEY = "ai-drive:first-upload-done"

export function FirstUploadGuide({ hasIndexedFile }: { hasIndexedFile: boolean }) {
  const [visible, setVisible] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only trigger on dashboard, not on chat page
    if (!hasIndexedFile || pathname?.startsWith("/chat")) return
    if (localStorage.getItem(STORAGE_KEY)) return
    setVisible(true)
  }, [hasIndexedFile, pathname])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  const goChat = () => {
    dismiss()
    router.push("/chat?q=" + encodeURIComponent("总结一下这个文件的内容"))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">AI 已记住你的文件！</h2>
        <p className="text-sm text-muted-foreground">
          试试问它点什么——比如总结内容、提取要点。
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={goChat} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            去对话
          </Button>
          <Button variant="outline" onClick={dismiss}>
            稍后再说
          </Button>
        </div>
      </div>
    </div>
  )
}
