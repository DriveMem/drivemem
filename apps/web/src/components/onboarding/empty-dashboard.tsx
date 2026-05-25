"use client"

import Link from "next/link"
import { Upload, MessageCircle, Code2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

const steps = [
  {
    icon: Upload,
    title: "Upload your first file",
    description: "PDFs, docs, code — your AI will remember it all.",
    href: "/files",
    action: "upload" as const,
    cta: "Go to Files",
  },
  {
    icon: MessageCircle,
    title: "Start a conversation",
    description: "Ask questions grounded in your uploaded knowledge.",
    href: "/chat?new=1",
    action: "chat" as const,
    cta: "Open Chat",
  },
  {
    icon: Code2,
    title: "Connect your AI tools",
    description: "Let Claude, GPT, or Cursor access your memory.",
    href: "/developers",
    action: "integrate" as const,
    cta: "View Integrations",
  },
]

export function EmptyDashboard() {
  return (
    <div className="rounded-2xl border border-border p-8 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-1">👋 Welcome to DriveMem</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Your AI finally has memory. Three steps to get started:
      </p>
      <div className="space-y-4">
        {steps.map((step) => (
          <Link
            key={step.action}
            href={step.href}
            onClick={() => trackEvent("onboarding.empty_state_click", { action: step.action })}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <step.icon className="h-4.5 w-4.5 text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium group-hover:text-brand-500 transition-colors">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground group-hover:text-brand-500 transition-colors self-center">
              {step.cta} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
