"use client"

import { useState, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/"
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        setError("邮箱或密码错误")
      } else {
        router.push(returnUrl)
        router.refresh()
      }
    } catch {
      setError("登录失败，请稍后重试")
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

      <h2 className="mb-6 text-2xl font-semibold">登录</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            className="rounded-xl h-12 text-base border-border/50 focus:ring-2 focus:ring-[#4F5BD5] focus:border-[#4F5BD5]"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">密码</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              忘记密码？
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="rounded-xl h-12 text-base border-border/50 focus:ring-2 focus:ring-[#4F5BD5] focus:border-[#4F5BD5]"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-border/50" />
          <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">记住我（30 天免登录）</label>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className="bg-[#4F5BD5] hover:bg-[#3D49C4] rounded-xl h-12 w-full text-white font-medium"
          disabled={loading}
        >
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        没有账号？{" "}
        <Link href="/signup" className="text-primary hover:underline">
          注册
        </Link>
      </p>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setValue("email", "demo@ai-drive.com")
            setValue("password", "demo123")
            handleSubmit(onSubmit)()
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition underline"
        >
          体验 Demo →
        </button>
      </div>
    </div>
  )
}
