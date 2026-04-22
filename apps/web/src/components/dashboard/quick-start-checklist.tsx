"use client"

import { Check, Circle, Upload, Terminal, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { ChecklistState } from "@/hooks/use-dashboard-phase"

interface QuickStartChecklistProps {
  checklist: ChecklistState
  onUpload: () => void
}

const steps = [
  { key: "uploadFile" as const, label: "Upload your first file", icon: Upload },
  { key: "connectAiTool" as const, label: "Connect an AI tool (Cursor / Claude / ChatGPT)", icon: Terminal },
  { key: "askAi" as const, label: "Ask AI about your files", icon: MessageCircle },
]

export function QuickStartChecklist({ checklist, onUpload }: QuickStartChecklistProps) {
  const router = useRouter()
  const doneCount = steps.filter(s => checklist[s.key]).length

  const handleClick = (key: string) => {
    if (key === "uploadFile") onUpload()
    else if (key === "connectAiTool") router.push("/developers")
    else if (key === "askAi") router.push("/chat?new=1")
  }

  return (
    <div className="mb-8 rounded-2xl border shadow-soft p-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Quick Start</h3>
        <span className="text-xs text-muted-foreground">{doneCount}/{steps.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const done = checklist[step.key]
          const Icon = step.icon
          return (
            <button
              key={step.key}
              onClick={() => !done && handleClick(step.key)}
              disabled={done}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition ${
                done
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-foreground"
              }`}
            >
              {done ? (
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
              )}
              <Icon className={`h-4 w-4 flex-shrink-0 ${done ? "text-emerald-400" : "text-muted-foreground"}`} />
              <span className={`text-sm ${done ? "line-through opacity-70" : ""}`}>
                {step.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
