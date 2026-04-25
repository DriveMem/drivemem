"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const STORAGE_KEY = "drivemem_first_upload_seen"

export function FirstUploadGuide({ hasIndexedFile }: { hasIndexedFile: boolean }) {
  useEffect(() => {
    if (!hasIndexedFile) return
    if (localStorage.getItem(STORAGE_KEY)) return

    localStorage.setItem(STORAGE_KEY, "1")

    toast("✨ Great! DriveMem will auto-summarize and organize this file. Your AI tools can now access it.", {
      duration: 3000,
    })
  }, [hasIndexedFile])

  return null
}
