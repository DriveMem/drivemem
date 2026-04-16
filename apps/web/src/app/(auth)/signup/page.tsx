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
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain letters")
      .regex(/[0-9]/, "Password must contain numbers"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type SignupForm = z.infer<typeof signupSchema>

const PRODUCTION_API = "https://api.drivemem.cloud"
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
const API_BASE = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

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
          setError("This email is already registered. Please sign in or use a different email")
        } else {
          setError(body.error?.message || body.message || "Sign up failed. Please try again later.")
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
      setError("Sign up failed. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      {/* Mobile-only header */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-3xl text-gray-100 font-serif">DriveMem</h1>
        <p className="mt-2 text-sm text-zinc-400">Memory for your AI agents</p>
      </div>

      <h2 className="mb-6 text-2xl font-semibold text-gray-100">Create account</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            className="rounded-xl h-12 text-base border-white/[0.08] placeholder:text-gray-600 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white/[0.05] text-gray-100"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters with letters and numbers"
            className="rounded-xl h-12 text-base border-white/[0.08] placeholder:text-gray-600 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white/[0.05] text-gray-100"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            className="rounded-xl h-12 text-base border-white/[0.08] placeholder:text-gray-600 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white/[0.05] text-gray-100"
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
          className="bg-[#5E6AD2] hover:bg-[#6E78E0] rounded-xl h-12 w-full text-white font-medium"
          disabled={loading}
        >
          {loading ? "Sign up..." : "Sign up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-500 hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground/60">
        By signing up, you agree to the <Link href="/terms" className="underline hover:text-foreground">Terms of Use</Link> and <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
      </p>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-300 transition underline">
          Sign in with Demo account →
        </Link>
      </div>
    </div>
  )
}
