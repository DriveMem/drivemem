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
      toast.success("Thanks for your feedback!")
      setText("")
      setOpen(false)
    } catch {
      toast.error("SendFailed，Please try again later")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#4F5BD5] px-4 py-2.5 text-sm text-white shadow-lg hover:bg-[#3D49C4] transition"
      >
        <MessageCircle className="h-4 w-4" /> Feedback
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>💬 Send feedback</DialogTitle>
          </DialogHeader>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us your thoughts, suggestions, or issues..."
            className="w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-[#4F5BD5] resize-none h-32"
          />
          <Button onClick={handleSubmit} disabled={!text.trim() || sending} className="w-full bg-[#4F5BD5] hover:bg-[#3D49C4]">
            {sending ? "Sending..." : <><Send className="h-4 w-4 mr-2" /> Send feedback</>}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
