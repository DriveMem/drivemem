"use client"

import { useState, useEffect } from "react"
import { X, Trash2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

export function SampleDataBanner() {
  const [hasSamples, setHasSamples] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    apiFetch("/api/v1/files/samples/status", { silent: true })
      .then((data) => {
        if (data?.hasSamples) setHasSamples(true)
      })
      .catch(() => {})
  }, [])

  if (!hasSamples || dismissed) return null

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await apiFetch("/api/v1/files/samples", { method: "DELETE" })
      setHasSamples(false)
      toast.success("Sample data removed")
    } catch {
      toast.error("Failed to remove sample data")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
      <Sparkles className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        <strong>Sample data</strong> — These example notes help you explore DriveMem. Remove them when you&apos;re ready.
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRemove}
        disabled={removing}
        className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900"
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        {removing ? "Removing…" : "Remove samples"}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
