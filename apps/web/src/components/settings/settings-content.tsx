"use client"

import { useState, useEffect } from "react"
import { getSession, signOut } from "next-auth/react"
import { toast } from "sonner"
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
  const [session, setSession] = useState<any>(null)
  const [name, setName] = useState("用户")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    getSession().then((s) => {
      if (s) {
        setSession(s)
        setName(s.user?.name || "用户")
      }
    })
  }, [])

  const [memories, setMemories] = useState<any[]>([])

  const fetchMemories = async () => {
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/users/me/memories")
      setMemories(data.memories || [])
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchMemories() }, [])

  const handleDeleteMemory = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/users/me/memories/${id}`, { method: "DELETE" })
      toast.success("已删除")
      fetchMemories()
    } catch { toast.error("删除失败") }
  }

  const [storageUsed, setStorageUsed] = useState<string>("—")
  const [storageTotal, setStorageTotal] = useState<string>("—")
  const [chatUsedToday, setChatUsedToday] = useState<string>("—")
  const [chatLimitToday, setChatLimitToday] = useState<string>("—")

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const s = await getSession()
        const token = (s as any)?.accessToken
        const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
        const res = await fetch(apiBase + "/api/users/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error("not ok")
        const data = await res.json()
        setStorageUsed(((data.storageUsed || 0) / 1073741824).toFixed(2))
        setStorageTotal(((data.storageLimit || 5368709120) / 1073741824).toFixed(1))
        setChatUsedToday(String(data.dailyChatCount ?? "—"))
        setChatLimitToday(String(data.dailyChatLimit ?? 20))
      } catch {
        // API not available, keep fallback "—"
      }
    }
    fetchUsage()
  }, [])

  const handleExport = async () => {
    try {
      const s = await getSession()
      const token = (s as any)?.accessToken
      const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
      const res = await fetch(apiBase + "/api/users/me/export", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("导出失败")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ai-drive-export-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("导出失败，请稍后重试")
    }
  }

  const handleDelete = () => {
    if (deleteConfirm === "确认删除") {
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
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => toast.success("已保存")}>保存</Button>
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
                style={{ width: `${storageUsed !== "—" && storageTotal !== "—" ? (parseFloat(storageUsed) / parseFloat(storageTotal)) * 100 : 0}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            今日对话：{chatUsedToday} / {chatLimitToday} 次
          </p>
        </CardContent>
      </Card>

      {/* AI Memory */}
      <Card>
        <CardHeader>
          <CardTitle>🧠 AI 记忆</CardTitle>
          <p className="text-sm text-muted-foreground">AI 从你的对话中学到的偏好和关注点</p>
        </CardHeader>
        <CardContent>
          {memories.length === 0 ? (
            <p className="text-sm text-muted-foreground">AI 还没有记住任何内容。多聊聊试试。</p>
          ) : (
            <ul className="space-y-3">
              {memories.map(m => (
                <li key={m.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{m.key}</p>
                    <p className="text-xs text-muted-foreground">{m.value}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{new Date(m.createdAt).toLocaleDateString("zh-CN")}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeleteMemory(m.id)}>
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl h-12" />
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!currentPassword || !newPassword || newPassword.length < 6}
            onClick={async () => {
              try {
                const { apiFetch } = await import("@/lib/api")
                await apiFetch("/api/users/me/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) })
                toast.success("密码已修改")
                setCurrentPassword("")
                setNewPassword("")
              } catch (e: any) { toast.error(e.message || "修改失败") }
            }}
          >
            修改密码
          </Button>
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
                此操作不可撤销。请输入 <strong>确认删除</strong> 以继续。
              </p>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='输入「确认删除」'
              />
              <Button
                variant="destructive"
                disabled={deleteConfirm !== "确认删除"}
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
