"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"

const SettingsContent = dynamic(() => import("@/components/settings/settings-content"), { ssr: false })

export default function SettingsPage() {
  useEffect(() => { document.title = "设置 - DriveMem" }, [])
  return <SettingsContent />
}
