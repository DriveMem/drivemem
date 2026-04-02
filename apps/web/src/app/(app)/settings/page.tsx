"use client"

import dynamic from "next/dynamic"

const SettingsContent = dynamic(() => import("@/components/settings/settings-content"), { ssr: false })

export default function SettingsPage() {
  return <SettingsContent />
}
