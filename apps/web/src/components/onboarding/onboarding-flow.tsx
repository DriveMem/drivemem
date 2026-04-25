"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Upload, Sparkles, Code2, BookOpen, ArrowRight } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useUploadFile } from "@/hooks/use-files"
import { Button } from "@/components/ui/button"

// ─── Main Flow (2-step: Welcome → Quick Setup) ──────────────

export function OnboardingFlow() {
  const [step, setStep] = useState(0)
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
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const advanceStep = useCallback(async (nextStep: number) => {
    setStep(nextStep)
    await apiFetch("/api/users/me/onboarding", {
      method: "PATCH",
      body: JSON.stringify({ step: nextStep }),
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
          {[0, 1].map((i) => (
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
        {step === 1 && <StepQuickSetup onComplete={complete} onSkip={complete} />}
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
      <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
        Your AI tools&apos; shared memory — everything they learn, organized and searchable.
      </p>
      <Button
        onClick={onNext}
        className="rounded-xl shadow-soft px-8 active:scale-[0.98] transition-transform"
      >
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

// ─── Step 1: Quick Setup (two side-by-side cards) ────────────

const MCP_COMMAND = `npx drivemem setup`

function StepQuickSetup({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  onSkip: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const uploadFile = useUploadFile()

  const handleCopy = () => {
    navigator.clipboard.writeText(MCP_COMMAND).then(() => {
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
            setUploadSuccess(true)
            toast.success("File uploaded! DriveMem is processing it.")
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

  if (uploadSuccess) {
    return (
      <div className="text-center py-8 animate-in fade-in duration-300">
        <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold mb-2">Processing your file…</h2>
        <p className="text-sm text-muted-foreground">
          DriveMem will auto-summarize and organize it. Your AI tools can now access it.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">Quick Setup</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Choose how you&apos;d like to get started — or do both!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Connect AI Tools card */}
        <div className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-primary/50 hover:bg-primary/5">
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Code2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm font-semibold">Connect AI Tools</div>
          <button
            onClick={handleCopy}
            className={cn(
              "w-full flex items-center gap-2 p-3 rounded-lg border font-mono text-xs transition-all",
              copied
                ? "border-primary bg-primary/5"
                : "hover:border-primary/50 active:scale-[0.98]"
            )}
          >
            <code className="flex-1 text-left truncate">{MCP_COMMAND}</code>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Works with Claude, Cursor, Windsurf
          </p>
        </div>

        {/* Upload Knowledge card */}
        <div className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-primary/50 hover:bg-primary/5">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-sm font-semibold">Upload Knowledge</div>
          <div
            {...getRootProps()}
            className={cn(
              "w-full border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-primary/50",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Uploading…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">
                  {isDragActive ? "Drop here!" : "Click or drag a file"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
