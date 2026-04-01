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
  password: z.string().min(8, '密码至少 8 位')
    .regex(/[a-zA-Z]/, '密码需包含字母')
    .regex(/[0-9]/, '密码需包含数字'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
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
          <CardTitle className="text-center">链接无效</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          重置链接无效或已过期。
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">重新获取</Link>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">密码已重置</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          你的密码已成功重置。
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push('/login')}>去登录</Button>
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
        setError(err.message || '重置失败，链接可能已过期')
        setLoading(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">设置新密码</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">新密码</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '重置中...' : '重置密码'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">加载中...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
