import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ResetPassword - DriveMem",
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
