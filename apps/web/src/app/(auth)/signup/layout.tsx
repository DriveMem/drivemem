import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign up - AI Drive",
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
