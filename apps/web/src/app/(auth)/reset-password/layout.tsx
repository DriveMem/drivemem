import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ResetPassword - AI Drive",
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
