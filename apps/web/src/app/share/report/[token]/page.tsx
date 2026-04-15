"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const PRODUCTION_API = "https://api.drivemem.cloud"
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
const API_URL = isDev ? (process.env.NEXT_PUBLIC_API_URL || "") : PRODUCTION_API

interface ShareData {
  report: string
  createdAt: string
  fileCount: number
  sharedBy: string
}

export default function SharedReportPage() {
  const params = useParams<{ token: string }>()
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/shares/report/${params.token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [params.token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg text-muted-foreground">Report not found or link has expired</p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    )
  }

  const formattedDate = new Date(data.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">
          AI Drive
        </Link>
        <Button asChild>
          <Link href="/signup">Sign up free</Link>
        </Button>
      </nav>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold">📊 AI Analysis Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Based on {data.fileCount} files · {formattedDate}
        </p>
        <div className="mt-6 rounded-xl border p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.report}</ReactMarkdown>
          </div>
        </div>
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-600/10 to-pink-600/10 border border-indigo-500/20 p-8 text-center">
          <h2 className="text-xl font-bold">🚀 Create your AI knowledge library for free</h2>
          <p className="mt-2 text-sm text-muted-foreground">Upload filesto get started — AI automatically generates analysis reports</p>
          <Button asChild className="mt-4 bg-brand-500 hover:bg-brand-600 text-white px-8">
            <Link href="/signup">Sign up free</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
