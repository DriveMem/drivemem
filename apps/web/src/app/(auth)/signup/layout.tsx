import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "注册 - DriveMem",
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
