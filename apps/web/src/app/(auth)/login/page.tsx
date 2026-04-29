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
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
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
        rememberMe: rememberMe ? "true" : "false",
        redirect: false,
      })
      if (result?.error) {
        setError("Incorrect email or password")
      } else {
        router.push(returnUrl)
        router.refresh()
      }
    } catch {
      setError("Sign in failed. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      {/* Mobile-only header */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-3xl text-zinc-900 dark:text-white font-serif">DriveMem</h1>
        <p className="mt-2 text-sm text-zinc-400">Memory for your AI agents</p>
      </div>

      <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Sign in</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            className="rounded-xl h-12 text-base border-zinc-200 dark:border-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-transparent"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="rounded-xl h-12 text-base border-zinc-200 dark:border-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-transparent"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-border/50" />
          <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">Remember me (30 days)</label>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl h-12 w-full text-white font-medium"
          disabled={loading}
        >
          {loading ? "Sign in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/signup" className="text-brand-500 hover:underline">
          Sign up
        </Link>
      </p>

      {process.env.NEXT_PUBLIC_SHOW_DEMO === 'true' && (
        <div className="mt-4 text-center">
          <Link
            href="/signup"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition underline"
          >
            New here? Create a free account →
          </Link>
        </div>
      )}
    </div>
  )
}
