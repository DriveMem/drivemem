"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ShareData {
  file: {
    name: string
    mimeType: string
    size: number
    summary?: string | null
    createdAt: string
  }
  downloadUrl: string
  sharedBy: string
}

function fmtSize(b: number) {
  if (!b) return "—"
  if (b < 1024) return "< 1 KB"
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB"
  return (b / 1048576).toFixed(1) + " MB"
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
    fetch(`${apiUrl}/api/shares/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">AI Drive</Link>
        <Button asChild><Link href="/signup">免费注册</Link></Button>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {loading ? (
          <Card>
            <CardContent className="p-8 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : error || !data ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-lg text-muted-foreground">链接已过期或不存在</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href="/">返回首页</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
          <Card>
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold">{data.file.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {fmtSize(data.file.size)} · {data.file.mimeType}
              </p>

              {data.file.summary && (
                <div className="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                  <h2 className="text-sm font-semibold flex items-center gap-1">🧠 AI 摘要</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{data.file.summary}</p>
                </div>
              )}

              <Button className="mt-6 w-full" onClick={() => window.open(data.downloadUrl)}>
                下载文件
              </Button>
            </CardContent>
          </Card>

          <div className="mt-8 rounded-2xl bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 border border-blue-500/20 p-8 text-center">
            <h2 className="text-xl font-bold">🚀 免费创建你的 AI 知识库</h2>
            <p className="mt-2 text-sm text-muted-foreground">上传文件即可开始 — AI 自动理解、记忆、分析</p>
            <Button asChild className="mt-4 bg-[#4F5BD5] hover:bg-[#3D49C4] text-white px-8">
              <Link href="/signup">免费注册</Link>
            </Button>
          </div>
        </>
        )}
      </div>
    </div>
  )
}
