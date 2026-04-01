"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const forgotSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
})

type ForgotForm = z.infer<typeof forgotSchema>

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message || "发送失败，请稍后重试")
        return
      }

      setSent(true)
    } catch {
      setError("发送失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm text-center">
        <h2 className="mb-4 text-xl font-semibold">邮件已发送</h2>
        <p className="text-sm text-muted-foreground mb-4">
          已发送重置链接到你的邮箱，请查收。
        </p>
        <Link href="/login">
          <Button variant="outline">返回登录</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">忘记密码</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        输入你的邮箱，我们将发送重置密码链接。
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "发送中..." : "发送重置链接"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          返回登录
        </Link>
      </p>
    </div>
  )
}
