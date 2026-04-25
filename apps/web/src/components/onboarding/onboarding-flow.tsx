"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Upload, Sparkles, Code2, BookOpen, Globe } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useUploadFile } from "@/hooks/use-files"
import { Button } from "@/components/ui/button"

// ─── Main Flow ───────────────────────────────────────────────

export function OnboardingFlow() {
  const [step, setStep] = useState(0)
  const [path, setPath] = useState<"coding" | "knowledge" | null>(null)
  const [completed, setCompleted] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch("/api/users/me/profile"),
      apiFetch("/api/files?limit=1").catch(() => ({ files: [] })),
    ])
      .then(([profile, filesData]: any[]) => {
        const alreadyCompleted = profile?.onboardingCompleted ?? false
        const hasFiles = (filesData?.files?.length ?? filesData?.length ?? 0) > 0

        if (!alreadyCompleted && hasFiles) {
          setCompleted(true)
          apiFetch("/api/users/me/onboarding", {
            method: "PATCH",
            body: JSON.stringify({ completed: true }),
          }).catch(() => {})
          return
        }

        setCompleted(alreadyCompleted)
        setStep(profile?.onboardingStep ?? 0)
        if (profile?.onboardingPath) setPath(profile.onboardingPath as any)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const advanceStep = useCallback(async (nextStep: number, selectedPath?: string) => {
    setStep(nextStep)
    const body: any = { step: nextStep }
    if (selectedPath) body.path = selectedPath
    await apiFetch("/api/users/me/onboarding", {
      method: "PATCH",
      body: JSON.stringify(body),
    }).catch(() => {})
  }, [])

  const complete = useCallback(async () => {
    setCompleted(true)
    await apiFetch("/api/users/me/onboarding", {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
    }).catch(() => {})
  }, [])

  if (loading || completed) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-background rounded-2xl shadow-soft-lg border p-8 animate-in zoom-in-95 duration-300">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step
                  ? "w-8 bg-primary"
                  : i < step
                    ? "w-4 bg-primary/40"
                    : "w-4 bg-muted"
              )}
            />
          ))}
        </div>

        {step === 0 && <StepWelcome onNext={() => advanceStep(1)} />}
        {step === 1 && (
          <StepChoosePath
            onSelect={(p) => {
              setPath(p)
              advanceStep(2, p)
            }}
            onSkip={complete}
          />
        )}
        {step === 2 && (
          <StepQuickAction
            path={path}
            onComplete={complete}
            onSkip={complete}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 0: Welcome ─────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">👋</div>
      <h2 className="text-2xl font-semibold mb-3">Welcome to DriveMem</h2>
      <p className="text-sm text-muted-foreground mb-2 max-w-sm mx-auto">
        Your personal knowledge base that works with your AI tools.
      </p>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
        Upload documents, connect AI agents, and let DriveMem give your tools long-term memory.
      </p>
      <Button
        onClick={onNext}
        className="rounded-xl shadow-soft px-8 active:scale-[0.98] transition-transform"
      >
        Get Started
      </Button>
    </div>
  )
}

// ─── Step 1: Choose Path ─────────────────────────────────────

function StepChoosePath({
  onSelect,
  onSkip,
}: {
  onSelect: (path: "coding" | "knowledge") => void
  onSkip: () => void
}) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">How will you use DriveMem?</h2>
      <p className="text-sm text-muted-foreground mb-6">
        This helps us show you the most relevant setup steps.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => onSelect("coding")}
          className="w-full flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] text-left"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Code2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">I use AI coding tools</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Connect Cursor, Claude, or other AI tools via MCP
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect("knowledge")}
          className="w-full flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] text-left"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">I want to organize knowledge</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Upload documents and build a searchable knowledge base
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={onSkip}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}

// ─── Step 2: Quick Action ────────────────────────────────────

function StepQuickAction({
  path,
  onComplete,
  onSkip,
}: {
  path: "coding" | "knowledge" | null
  onComplete: () => void
  onSkip: () => void
}) {
  if (path === "coding") {
    return <CodingQuickAction onComplete={onComplete} onSkip={onSkip} />
  }
  return <KnowledgeQuickAction onComplete={onComplete} onSkip={onSkip} />
}

// --- Coding path: copy MCP command ---

const MCP_COMMAND = `npx drivemem setup`

function CodingQuickAction({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  onSkip: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(MCP_COMMAND).then(() => {
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(onComplete, 1500)
    })
  }

  return (
    <div className="text-center">
      <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">Connect your AI tools</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Add this MCP server to your AI tool configuration to give it access to your knowledge base.
      </p>

      <button
        onClick={handleCopy}
        className={cn(
          "w-full flex items-center gap-3 p-4 rounded-xl border font-mono text-sm transition-all",
          copied
            ? "border-primary bg-primary/5"
            : "hover:border-primary/50 hover:bg-muted/30 active:scale-[0.98]"
        )}
      >
        <code className="flex-1 text-left truncate text-xs">{MCP_COMMAND}</code>
        {copied ? (
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      <p className="text-xs text-muted-foreground mt-3">
        Works with Claude Desktop, Cursor, Windsurf, and other MCP-compatible tools.
      </p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button
          onClick={onComplete}
          className="rounded-xl shadow-soft px-8 active:scale-[0.98] transition-transform"
        >
          Done
        </Button>
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

// --- Knowledge path: upload area ---

function KnowledgeQuickAction({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  onSkip: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const uploadFile = useUploadFile()

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length === 0) return
      setUploading(true)
      const file = accepted[0]

      uploadFile.mutate(
        { file, onProgress: () => {} },
        {
          onSuccess: () => {
            setUploading(false)
            setSuccess(true)
            setTimeout(onComplete, 1500)
          },
          onError: () => {
            setUploading(false)
            toast.error("Upload failed — please try again")
          },
        }
      )
    },
    [uploadFile, onComplete]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 50 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  })

  if (success) {
    return (
      <div className="text-center py-8 animate-in fade-in duration-300">
        <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold mb-2">Processing your file…</h2>
        <p className="text-sm text-muted-foreground">
          DriveMem will auto-summarize and organize it. This only takes a moment.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">Add your first knowledge</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Connect Google Drive or upload a file to get started.
      </p>

      {/* GDrive Connect */}
      <a
        href="/settings?tab=connections"
        onClick={onComplete}
        className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] text-left mb-4"
      >
        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <div className="font-semibold text-sm">Connect Google Drive</div>
          <div className="text-xs text-muted-foreground mt-0.5">Sync your files automatically</div>
        </div>
      </a>

      <div className="text-xs text-muted-foreground mb-4">— or upload a file —</div>

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 sm:p-12 cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-muted-foreground/40" />
            <span className="text-sm text-muted-foreground">
              {isDragActive ? "Drop it here!" : "Click or drag a file"}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onSkip}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
