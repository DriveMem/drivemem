import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登录 - AI Drive",
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
