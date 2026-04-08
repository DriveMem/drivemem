"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, Bot, MessageSquare } from "lucide-react"

const STORAGE_KEY = "ai-drive-onboarding-completed"

interface OnboardingGuideProps {
  onUpload: () => void
}

const steps = [
  {
    icon: Upload,
    emoji: "📤",
    title: "上传你的第一个文件",
    description: "点击下方按钮上传 PDF、Word、Markdown 等文件，AI 会帮你理解和整理。",
    color: "blue",
  },
  {
    icon: Bot,
    emoji: "🤖",
    title: "AI 正在理解你的文件",
    description: "AI 正在分析你的文件内容，生成摘要和知识关联，请稍候...",
    color: "purple",
  },
  {
    icon: MessageSquare,
    emoji: "💬",
    title: "试试和 AI 对话",
    description: "你的文件已准备就绪！现在可以用自然语言和 AI 聊聊你的文件内容。",
    color: "green",
  },
]

export function OnboardingGuide({ onUpload }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true")
    setVisible(false)
  }, [])

  if (!visible) return null

  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Step indicator dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-blue-500"
                  : i < currentStep
                  ? "bg-blue-500/50"
                  : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
              step.color === "blue"
                ? "bg-blue-500/10"
                : step.color === "purple"
                ? "bg-purple-500/10"
                : "bg-green-500/10"
            }`}
          >
            <span className="text-3xl">{step.emoji}</span>
          </div>
        </div>

        {/* Content */}
        <h3 className="mb-2 text-center text-lg font-semibold">{step.title}</h3>
        <p className="mb-6 text-center text-sm text-muted-foreground">{step.description}</p>

        {/* Processing animation for step 2 */}
        {currentStep === 1 && (
          <div className="mb-6 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {currentStep === 0 && (
            <>
              <button
                onClick={() => {
                  onUpload()
                  setCurrentStep(1)
                  // Auto-advance to step 3 after delay (simulating processing)
                  setTimeout(() => setCurrentStep(2), 3000)
                }}
                className="w-full rounded-xl bg-[#4F5BD5] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3D49C4]"
              >
                上传文件
              </button>
              <button
                onClick={() => {
                  complete()
                  router.push("/dashboard?highlight=sample")
                }}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                📎 先用示例文件体验
              </button>
              <button
                onClick={() => setCurrentStep(1)}
                className="w-full rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                下一步
              </button>
            </>
          )}
          {currentStep === 1 && (
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              下一步
            </button>
          )}
          {currentStep === 2 && (
            <button
              onClick={() => {
                complete()
                router.push("/chat")
              }}
              className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              开始对话
            </button>
          )}
          <button
            onClick={complete}
            className="w-full rounded-xl px-4 py-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            跳过引导
          </button>
        </div>
      </div>
    </div>
  )
}
