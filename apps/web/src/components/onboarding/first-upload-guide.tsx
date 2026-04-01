"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const STORAGE_KEY = "ai-drive:first-upload-done"

export function FirstUploadGuide({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (show && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [show])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  const goChat = () => {
    dismiss()
    router.push("/chat?q=" + encodeURIComponent("帮我总结这个文件的要点"))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <span className="text-4xl">🎉</span>
          <h2 className="text-lg font-semibold">文件已记住！</h2>
          <p className="text-sm text-muted-foreground">
            试试问 AI 一个问题
          </p>
          <div className="flex gap-3">
            <Button onClick={goChat}>开始对话</Button>
            <Button variant="outline" onClick={dismiss}>
              稍后再说
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
