"use client"
import { useState } from "react"
import { MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await apiFetch("/api/feedback", { method: "POST", body: JSON.stringify({ content: text.trim() }) })
      toast.success("感谢你的反馈！")
      setText("")
      setOpen(false)
    } catch {
      toast.error("发送失败，请稍后重试")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm text-white shadow-lg hover:bg-blue-700 transition"
      >
        <MessageCircle className="h-4 w-4" /> 反馈
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>💬 发送反馈</DialogTitle>
          </DialogHeader>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="告诉我们你的想法、建议或遇到的问题..."
            className="w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
          />
          <Button onClick={handleSubmit} disabled={!text.trim() || sending} className="w-full bg-blue-600 hover:bg-blue-700">
            {sending ? "发送中..." : <><Send className="h-4 w-4 mr-2" /> 发送反馈</>}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
