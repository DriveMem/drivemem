"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Upload, Copy, Check, Sparkles, FileText, Globe, Code2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useUploadFile } from "@/hooks/use-files"
import { Button } from "@/components/ui/button"

// ─── Main Flow ───────────────────────────────────────────────

export function OnboardingFlow() {
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/users/me/profile")
      .then((data: any) => {
        setCompleted(data?.onboardingCompleted ?? true)
        setStep(data?.onboardingStep ?? 0)
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

        {step === 0 && <StepUpload onNext={() => advanceStep(1)} />}
        {step === 1 && (
          <StepConnect
            onNext={() => advanceStep(2)}
            onSkip={() => advanceStep(2)}
          />
        )}
        {step === 2 && <StepComplete onFinish={complete} />}
      </div>
    </div>
  )
}

// ─── Step 0: Upload ──────────────────────────────────────────

function StepUpload({ onNext }: { onNext: () => void }) {
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
            setTimeout(onNext, 1500)
          },
          onError: () => {
            setUploading(false)
            toast.error("Upload failed — please try again")
          },
        }
      )
    },
    [uploadFile, onNext]
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
        <h2 className="text-xl font-semibold mb-2">AI is processing…</h2>
        <p className="text-sm text-muted-foreground">
          Your file is being indexed. This only takes a moment.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">Upload your first knowledge</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Drop a file here — notes, docs, decisions, anything
      </p>

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-200",
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
        onClick={onNext}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}

// ─── Step 1: Connect Agent ───────────────────────────────────

const CLAUDE_CONFIG = JSON.stringify(
  {
    mcpServers: {
      drivemem: {
        command: "npx",
        args: ["-y", "@anthropic-ai/mcp-server-drivemem"],
        env: { DRIVEMEM_API_KEY: "YOUR_API_KEY" },
      },
    },
  },
  null,
  2
)

const CURSOR_CONFIG = JSON.stringify(
  {
    mcpServers: {
      drivemem: {
        url: "https://api.drivemem.cloud/mcp",
        headers: { Authorization: "Bearer YOUR_API_KEY" },
      },
    },
  },
  null,
  2
)

interface AgentCard {
  name: string
  icon: typeof FileText
  action: "copy" | "link"
  config?: string
  href?: string
  description: string
}

const AGENTS: AgentCard[] = [
  {
    name: "Claude Desktop",
    icon: FileText,
    action: "copy",
    config: CLAUDE_CONFIG,
    description: "Copy MCP config",
  },
  {
    name: "ChatGPT",
    icon: Globe,
    action: "link",
    href: "https://drivemem.cloud/extension",
    description: "Install browser extension",
  },
  {
    name: "Cursor",
    icon: Code2,
    action: "copy",
    config: CURSOR_CONFIG,
    description: "Copy MCP config",
  },
]

function StepConnect({
  onNext,
  onSkip,
}: {
  onNext: () => void
  onSkip: () => void
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleCopy = useCallback(
    (config: string, idx: number) => {
      navigator.clipboard.writeText(config).then(() => {
        setCopiedIdx(idx)
        toast.success("Copied!")
        timerRef.current = setTimeout(onNext, 1500)
      })
    },
    [onNext]
  )

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">Connect your first agent</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Pick your favorite tool and connect it to your knowledge base
      </p>

      <div className="space-y-3">
        {AGENTS.map((agent, idx) => {
          const Icon = agent.icon
          const isCopied = copiedIdx === idx
          return (
            <button
              key={agent.name}
              onClick={() => {
                if (agent.action === "copy" && agent.config) {
                  handleCopy(agent.config, idx)
                } else if (agent.action === "link" && agent.href) {
                  window.open(agent.href, "_blank")
                  setTimeout(onNext, 1500)
                }
              }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
                "hover:border-primary/50 hover:bg-muted/30 active:scale-[0.98]",
                isCopied && "border-primary bg-primary/5"
              )}
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{agent.name}</div>
                <div className="text-xs text-muted-foreground">
                  {agent.description}
                </div>
              </div>
              {isCopied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground/40" />
              )}
            </button>
          )
        })}
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

// ─── Step 2: Complete ────────────────────────────────────────

function StepComplete({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center py-4 animate-in fade-in duration-300">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
        Your knowledge base is ready. Agents can now access your files.
      </p>
      <Button
        onClick={onFinish}
        className="rounded-xl shadow-soft px-8 active:scale-[0.98] transition-transform"
      >
        Go to Dashboard
      </Button>
    </div>
  )
}
