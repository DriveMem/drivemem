"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Brain, ChevronLeft, ChevronRight, FolderPlus, UserPen } from "lucide-react"
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
  const [step, setStep] = useState(0) // 0: persona, 1: profile, 2: project
  const [persona, setPersona] = useState<string | null>(null)
  const [role, setRole] = useState("")
  const [currentGoal, setCurrentGoal] = useState("")
  const [projectName, setProjectName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("ai-drive-onboarded")) {
      setOpen(true)
    }
  }, [])

  const handleSkip = () => {
    localStorage.setItem("ai-drive-onboarded", "true")
    setOpen(false)
  }

  const handleFinish = () => {
    localStorage.setItem("ai-drive-onboarded", "true")
    if (persona) {
      localStorage.setItem("ai-drive-persona", persona)
    }
    setOpen(false)
  }

  const handleSaveProfile = async () => {
    if (!role.trim() && !currentGoal.trim()) {
      setStep(2)
      return
    }
    setSaving(true)
    try {
      await apiFetch("/api/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ role: role.trim(), currentGoal: currentGoal.trim() }),
      })
      toast.success("AI 档案已保存")
      setStep(2)
    } catch {
      toast.error("保存失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateProject = async () => {
    if (!projectName.trim()) return
    setSaving(true)
    try {
      await apiFetch("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim() }),
      })
      toast.success("项目已创建")
      handleFinish()
    } catch {
      toast.error("创建失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  const uploadHint = persona ? personaConfig[persona].uploadHint : "上传你的第一份文件"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {step === 0 && "👋 你好，你是？"}
            {step === 1 && "📝 设置你的 AI 档案"}
            {step === 2 && "📁 创建你的第一个项目"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 0: Persona Selection */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Choose your role and DriveMem will customize your experience
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

        {/* Step 1: Profile Setup */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              告诉 AI 你是谁，它会更懂你
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <UserPen className="h-4 w-4 text-indigo-500" />
                  你的角色
                </label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="如产品经理、开发者、研究员"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#4F5BD5]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  当前目标
                </label>
                <input
                  value={currentGoal}
                  onChange={(e) => setCurrentGoal(e.target.value)}
                  placeholder="如做一个 AI 产品、写毕业论文"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#4F5BD5]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-[#4F5BD5] hover:bg-[#3D49C4] disabled:opacity-50"
              >
                {saving ? "保存中..." : "继续"}
                {!saving && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(0)} className="flex-1 text-muted-foreground">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  返回
                </Button>
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 text-muted-foreground">
                  跳过
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Create Project */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              创建一个项目来组织你的文件和知识
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-indigo-500" />
                  项目名称
                </label>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="如 AI 产品调研、毕业论文"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#4F5BD5]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving && projectName.trim()) handleCreateProject()
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleCreateProject}
                disabled={saving || !projectName.trim()}
                className="bg-[#4F5BD5] hover:bg-[#3D49C4] disabled:opacity-50"
              >
                {saving ? "创建中..." : "创建项目"}
              </Button>
              <Button variant="outline" onClick={async () => {
                try {
                  await apiFetch("/api/onboarding/demo-files", { method: "POST" })
                  toast.success("示例文件已创建，AI 正在理解...")
                  handleFinish()
                } catch { toast.error("创建失败，请重试") }
              }}>
                📎 用示例文件体验
              </Button>
              <Button onClick={handleFinish} className="bg-[#4F5BD5] hover:bg-[#3D49C4]">
                开始使用 DriveMem 🚀
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
