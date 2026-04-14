'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const resetSchema = z.object({
  password: z.string().min(8, 'PasswordAt least 8 characters')
    .regex(/[a-zA-Z]/, 'PasswordMust contain letters')
    .regex(/[0-9]/, 'PasswordMust contain numbers'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ResetForm = z.infer<typeof resetSchema>

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Invalid link</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          ResetLink is invalid or has expired.
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">Re-fetch</Link>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">PasswordReset</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Your password has been successfully reset.
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push('/login')}>Go to sign in</Button>
        </CardFooter>
      </Card>
    )
  }

  async function onSubmit(data: ResetForm) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.message || 'ResetFailed，Link may have expired')
        setLoading(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error, please try again')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">SettingsNew password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">ConfirmNew password</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Reset...' : 'ResetPassword'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
