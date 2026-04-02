"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function SettingsContent() {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user?.name || "用户")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  const storageUsed = 1.8
  const storageTotal = 5
  const chatUsedToday = 7
  const chatLimitToday = 20

  const handleExport = async () => {
    const blob = new Blob([JSON.stringify({ name, exportedAt: new Date().toISOString() })], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ai-drive-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = () => {
    if (deleteConfirm === "DELETE") {
      alert("账号已删除（mock）")
      setDeleteOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {session?.user?.email && (
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" value={session.user.email} readOnly className="bg-muted" />
            </div>
          )}
          <Button size="sm">保存</Button>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>用量</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">
              存储空间：{storageUsed} GB / {storageTotal} GB
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(storageUsed / storageTotal) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            今日对话：{chatUsedToday} / {chatLimitToday} 次
          </p>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={handleExport}>
            导出数据
          </Button>
          <Button variant="outline" className="w-full" onClick={() => signOut({ callbackUrl: "/" })}>
            退出登录
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">删除账号</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认删除账号</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                此操作不可撤销。请输入 <strong>DELETE</strong> 确认。
              </p>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='输入 "DELETE"'
              />
              <Button
                variant="destructive"
                disabled={deleteConfirm !== "DELETE"}
                onClick={handleDelete}
              >
                确认删除
              </Button>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
