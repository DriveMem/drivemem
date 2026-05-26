"use client"

import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface ContextWarningProps {
  percent: number
}

export function ContextWarning({ percent }: ContextWarningProps) {
  const router = useRouter()

  if (percent < 85) return null

  return (
    <div className="mx-4 my-2 flex items-center gap-3 rounded-lg border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-2.5">
      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
      <p className="text-xs text-yellow-700 dark:text-yellow-400 flex-1">
        Context is {percent >= 90 ? "full" : "nearly full"}. Start a new conversation for best results.
      </p>
      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => router.push("/chat?new=" + Date.now())}>
        New Chat
      </Button>
    </div>
  )
}
