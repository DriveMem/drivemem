"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm text-center">
      <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="mb-4 text-xl font-semibold">忘记密码</h2>
      <p className="text-sm text-muted-foreground mb-6">
        MVP 阶段暂不支持自助重置密码。
        <br />
        请联系支持团队帮你重置。
      </p>
      <Link href="/login">
        <Button variant="outline" className="w-full">返回登录</Button>
      </Link>
    </div>
  )
}
