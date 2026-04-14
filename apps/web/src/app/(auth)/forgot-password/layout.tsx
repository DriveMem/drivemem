import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot Password - DriveMem",
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
