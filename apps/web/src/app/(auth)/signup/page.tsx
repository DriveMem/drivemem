"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const signupSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱地址"),
    password: z
      .string()
      .min(8, "密码至少 8 位")
      .regex(/[a-zA-Z]/, "密码必须包含字母")
      .regex(/[0-9]/, "密码必须包含数字"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  })

type SignupForm = z.infer<typeof signupSchema>

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password, name: data.email.split("@")[0] }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const code = body.error?.code || body.code
        if (res.status === 409 || code === "EMAIL_EXISTS" || code === "EMAIL_ALREADY_EXISTS" || code === "CONFLICT") {
          setError("该邮箱已注册，请直接登录或使用其他邮箱")
        } else {
          setError(body.error?.message || body.message || "注册失败，请稍后重试")
        }
        return
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        router.push("/login")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("注册失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      {/* Mobile-only header */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-3xl font-bold">AI Drive</h1>
        <p className="mt-2 text-sm text-muted-foreground">让 AI 记住你的一切</p>
      </div>

      <h2 className="mb-6 text-2xl font-semibold">注册</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            className="rounded-xl h-12 text-base border-border/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            placeholder="至少 8 位，含字母和数字"
            className="rounded-xl h-12 text-base border-border/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            className="rounded-xl h-12 text-base border-border/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 rounded-xl h-12 w-full text-white font-medium"
          disabled={loading}
        >
          {loading ? "注册中..." : "注册"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        已有账号？{" "}
        <Link href="/login" className="text-primary hover:underline">
          登录
        </Link>
      </p>
    </div>
  )
}
