import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Knowledge — DriveMem",
}

export default function FilesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
