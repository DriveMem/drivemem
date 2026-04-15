"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Brain, ChevronLeft, ChevronRight, FolderPlus, UserPen } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

const personas = [
  { id: "student", emoji: "📚", title: "Student", desc: "Write papers, take notes, organize materials" },
  { id: "worker", emoji: "💼", title: "Professional", desc: "Write reports, manage projects, create proposals" },
  { id: "researcher", emoji: "🔬", title: "Researcher", desc: "Read papers, do research, analyze data" },
  { id: "creator", emoji: "✍️", title: "Creator", desc: "Write articles, create content, find inspiration" },
]

const personaConfig: Record<string, { uploadHint: string; question: string }> = {
  student: { uploadHint: "UploadYour references or class notes", question: "Summarize the key points of this paper" },
  worker: { uploadHint: "UploadYour project documents or meeting notes", question: "Help me write a report summary using this material" },
  researcher: { uploadHint: "UploadYour research papers or data reports", question: "Compare the key findings of these two documents" },
  creator: { uploadHint: "UploadYour material files or references", question: "Help me extract writing inspiration from these materials" },
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
      toast.success("AI ProfileSaved")
      setStep(2)
    } catch {
      toast.error("Save failed, please try again")
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
      toast.success("ProjectCreated")
      handleFinish()
    } catch {
      toast.error("Create failed, please try again")
    } finally {
      setSaving(false)
    }
  }

  const uploadHint = persona ? personaConfig[persona].uploadHint : "UploadYour first file"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {step === 0 && "👋 Hello, who are you?"}
            {step === 1 && "📝 SettingsYour AI profile"}
            {step === 2 && "📁 CreateYour first project"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 0: Persona Selection */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Choose your role and AI Drive will customize your experience
            </p>
            <div className="grid grid-cols-2 gap-3">
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition hover:border-brand-500/50",
                    persona === p.id &&
                      "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500"
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
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50"
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Profile Setup */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Tell AI who you are and it will understand you better
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <UserPen className="h-4 w-4 text-indigo-500" />
                  Your role
                </label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Product Manager, Developer, Researcher"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  Current goal
                </label>
                <input
                  value={currentGoal}
                  onChange={(e) => setCurrentGoal(e.target.value)}
                  placeholder="e.g., build an AI product, write a thesis"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Save..." : "Continue"}
                {!saving && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(0)} className="flex-1 text-muted-foreground">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 text-muted-foreground">
                  Skip
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
              Create a project to organize your files and knowledge
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-indigo-500" />
                  Project name
                </label>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., AI product research, thesis"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-500"
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
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Create..." : "CreateProject"}
              </Button>
              <Button variant="outline" onClick={async () => {
                try {
                  await apiFetch("/api/onboarding/demo-files", { method: "POST" })
                  toast.success("Sample files created. AI is processing...")
                  handleFinish()
                } catch { toast.error("Create failed, please try again") }
              }}>
                📎 Try with sample files
              </Button>
              <Button onClick={handleFinish} className="bg-brand-500 hover:bg-brand-600">
                Start using AI Drive 🚀
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
