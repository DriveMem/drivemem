"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Brain, MessageSquare } from "lucide-react"

export function WelcomeModal({ onUpload }: { onUpload: () => void }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("ai-drive-onboarded")) {
      setOpen(true)
    }
  }, [])

  const handleSkip = () => {
    localStorage.setItem("ai-drive-onboarded", "true")
    setOpen(false)
  }

  const handleUpload = () => {
    localStorage.setItem("ai-drive-onboarded", "true")
    setOpen(false)
    onUpload()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">👋 欢迎来到 AI Drive</DialogTitle>
        </DialogHeader>
        <p className="text-center text-muted-foreground">让 AI 记住你的一切</p>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
              <Upload className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-medium">① 上传文件</p>
              <p className="text-xs text-muted-foreground">PDF、Word、Markdown、TXT</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium">② AI 自动理解</p>
              <p className="text-xs text-muted-foreground">自动摘要、分类、知识关联</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
              <MessageSquare className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">③ 随时提问</p>
              <p className="text-xs text-muted-foreground">用自然语言和你的文件对话</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleUpload} className="bg-[#4F5BD5] hover:bg-[#3D49C4]">上传第一个文件</Button>
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">跳过</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
