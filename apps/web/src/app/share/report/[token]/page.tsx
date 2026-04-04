"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ReportShareData {
  report: string
  createdAt: string
  fileCount: number
  sharedBy: string
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function ShareReportPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReportShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<"not_found" | "expired" | null>(null)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
    fetch(`${apiUrl}/api/report/${token}`)
      .then((res) => {
        if (res.status === 410) throw new Error("expired")
        if (!res.ok) throw new Error("not_found")
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message === "expired" ? "expired" : "not_found"))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">AI Drive</Link>
        <Button asChild><Link href="/signup">免费注册</Link></Button>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {loading ? (
          <Card>
            <CardContent className="p-8 space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-lg text-muted-foreground">
                {error === "expired" ? "链接已过期" : "链接不存在或已失效"}
              </p>
              <Button variant="outline" asChild className="mt-4">
                <Link href="/">返回首页</Link>
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <Card>
              <CardContent className="p-8">
                <h1 className="text-2xl font-bold">📊 AI 分析报告</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.sharedBy} 分享 · {fmtDate(data.createdAt)} · 分析了 {data.fileCount} 个文件
                </p>

                <div className="mt-8 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {data.report}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">用 AI Drive 分析你的文件，让 AI 洞察一切</p>
              <Button asChild className="mt-2">
                <Link href="/signup">免费开始</Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
