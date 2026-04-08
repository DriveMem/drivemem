"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Brain, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

const personas = [
  { id: "student", emoji: "📚", title: "学生", desc: "写论文、做笔记、整理资料" },
  { id: "worker", emoji: "💼", title: "职场人", desc: "做汇报、管项目、写方案" },
  { id: "researcher", emoji: "🔬", title: "研究员", desc: "读论文、做调研、分析数据" },
  { id: "creator", emoji: "✍️", title: "创作者", desc: "写文章、做内容、找灵感" },
]

const personaConfig: Record<string, { uploadHint: string; question: string }> = {
  student: { uploadHint: "上传你的参考文献或课堂笔记", question: "帮我总结这篇论文的核心观点" },
  worker: { uploadHint: "上传你的项目文档或会议纪要", question: "用这份材料帮我写一段汇报摘要" },
  researcher: { uploadHint: "上传你的研究论文或数据报告", question: "对比这两份资料的关键发现" },
  creator: { uploadHint: "上传你的素材文件或参考资料", question: "帮我从这些资料中提炼写作灵感" },
}

export function WelcomeModal({ onUpload }: { onUpload: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0) // 0: persona, 1: upload, 2: trial ask
  const [persona, setPersona] = useState<string | null>(null)
  const [trialQuestion, setTrialQuestion] = useState("")
  const [trialAnswer, setTrialAnswer] = useState("")
  const [trialLoading, setTrialLoading] = useState(false)

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

  const handleFinish = () => {
    localStorage.setItem("ai-drive-onboarded", "true")
    if (persona) {
      localStorage.setItem("ai-drive-persona", persona)
    }
    setOpen(false)
  }

  const handleTrialAsk = async () => {
    const q = trialQuestion || (persona ? personaConfig[persona].question : "帮我总结这个文件")
    setTrialLoading(true)
    try {
      const res = await apiFetch("/api/v1/ask", {
        method: "POST",
        body: JSON.stringify({ question: q }),
      })
      setTrialAnswer(res?.answer || "AI 正在学习你的文件，稍后再试...")
    } catch {
      setTrialAnswer("上传文件后 AI 就能回答你的问题了！先上传一份试试吧 ✨")
    } finally {
      setTrialLoading(false)
    }
  }

  const uploadHint = persona ? personaConfig[persona].uploadHint : "上传你的第一份文件"
  const questionHint = persona ? personaConfig[persona].question : "帮我总结这个文件"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {step === 0 && "👋 你好，你是？"}
            {step === 1 && "📄 上传你的第一份文件"}
            {step === 2 && "💬 试试和 AI 对话"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 0: Persona Selection */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              选择你的身份，AI Drive 会为你定制体验
            </p>
            <div className="grid grid-cols-2 gap-3">
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition hover:border-[#4F5BD5]/50",
                    persona === p.id &&
                      "border-[#4F5BD5] bg-[#4F5BD5]/5 ring-1 ring-[#4F5BD5]"
                  )}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <p className="mt-1 text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => setStep(1)}
                disabled={!persona}
                className="bg-[#4F5BD5] hover:bg-[#3D49C4] disabled:opacity-50"
              >
                继续
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                跳过
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <Upload className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{uploadHint}</p>
                <p className="text-xs text-muted-foreground">支持 PDF、Word、Markdown、TXT</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                <Brain className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">AI 自动理解</p>
                <p className="text-xs text-muted-foreground">自动摘要、分类、知识关联</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleUpload} className="bg-[#4F5BD5] hover:bg-[#3D49C4]">
                上传文件
              </Button>
              <Button variant="outline" onClick={async () => {
                try {
                  await apiFetch("/api/onboarding/demo-files", { method: "POST" })
                  toast.success("示例文件已创建，AI 正在理解...")
                  setStep(2)
                } catch { toast.error("创建失败，请重试") }
              }}>
                📎 用示例文件体验
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(0)} className="flex-1 text-muted-foreground">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  返回
                </Button>
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 text-muted-foreground">
                  先跳过
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Trial Ask */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              试试问 AI：&ldquo;{questionHint}&rdquo;
            </p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={trialQuestion}
                  onChange={(e) => setTrialQuestion(e.target.value)}
                  placeholder={questionHint}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#4F5BD5]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !trialLoading) handleTrialAsk()
                  }}
                />
                <button
                  onClick={handleTrialAsk}
                  disabled={trialLoading}
                  className="rounded-lg bg-[#4F5BD5] px-4 py-2 text-sm text-white hover:bg-[#3D49C4] disabled:opacity-50"
                >
                  {trialLoading ? "思考中..." : "问一下"}
                </button>
              </div>
              {trialAnswer && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {trialAnswer}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleFinish} className="bg-[#4F5BD5] hover:bg-[#3D49C4]">
                开始使用 AI Drive 🚀
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">
                <ChevronLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
