"use client"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-bold">出错了</h1>
      <p className="text-sm text-muted-foreground">页面遇到了一个问题，请刷新重试</p>
      <div className="flex gap-3">
        <Button onClick={reset}>重试</Button>
        <Button variant="outline" onClick={() => window.location.href = "/"}>回到首页</Button>
      </div>
    </div>
  )
}
