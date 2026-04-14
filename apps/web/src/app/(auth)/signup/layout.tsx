import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "注册 - AI Drive",
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
