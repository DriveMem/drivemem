"use client"

import { useState, useEffect, useRef } from "react"
import { getSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const sections = [
  { id: "profile", emoji: "👤", title: "个人信息", desc: "用户名、头像、邮箱等基础信息" },
  { id: "ai", emoji: "🤖", title: "AI 设置", desc: "AI 记忆管理、语言偏好、自动摘要开关" },
  { id: "notifications", emoji: "🔔", title: "通知偏好", desc: "控制各类通知的开关" },
  { id: "security", emoji: "🔒", title: "安全", desc: "修改密码与登录信息管理" },
  { id: "data", emoji: "💾", title: "数据管理", desc: "存储用量、数据导出与账号操作" },
] as const

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

  // AI Memories
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

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    fileUpdates: true,
    aiAnalysis: true,
    storageWarning: true,
    systemAnnouncements: true,
  })
  const [notifLoading, setNotifLoading] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)

  useEffect(() => {
    import("@/lib/api").then(({ apiFetch }) => {
      apiFetch("/api/notifications/preferences")
        .then((data: any) => {
          if (data?.preferences) setNotifPrefs(data.preferences)
        })
        .catch(() => {})
        .finally(() => setNotifLoading(false))
    })
  }, [])

  const handleNotifToggle = async (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value }
    setNotifPrefs(updated)
    setNotifSaving(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch("/api/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify(updated),
      })
      toast.success("通知设置已保存")
    } catch {
      toast.error("保存失败")
      setNotifPrefs(notifPrefs)
    } finally {
      setNotifSaving(false)
    }
  }

  // Usage
  const [storageUsed, setStorageUsed] = useState<string | null>(null)
  const [storageTotal, setStorageTotal] = useState<string | null>(null)
  const [chatUsedToday, setChatUsedToday] = useState<string | null>(null)
  const [chatLimitToday, setChatLimitToday] = useState<string | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageError, setUsageError] = useState(false)

  const fetchUsage = async () => {
    setUsageLoading(true)
    setUsageError(false)
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
      setChatUsedToday(String(data.dailyChatCount ?? 0))
      setChatLimitToday(String(data.dailyChatLimit ?? 20))
    } catch {
      setUsageError(true)
    } finally {
      setUsageLoading(false)
    }
  }

  useEffect(() => { fetchUsage() }, [])

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
    if (deleteConfirm === "DELETE") {
      alert("账号已删除（mock）")
      setDeleteOpen(false)
    }
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">设置</h1>

      <div className="flex gap-8">
        {/* Left nav */}
        <nav className="hidden md:block w-48 shrink-0 sticky top-6 self-start">
          <ul className="space-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s.emoji} {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* 👤 个人信息 */}
          <section id="profile" className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-1">👤 个人信息</h2>
            <p className="text-sm text-muted-foreground mb-4">用户名、头像、邮箱等基础信息</p>
            <div className="space-y-4">
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
            </div>
          </section>

          {/* 🤖 AI 设置 */}
          <section id="ai" className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-1">🤖 AI 设置</h2>
            <p className="text-sm text-muted-foreground mb-4">AI 记忆管理、语言偏好、自动摘要开关</p>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">AI 记忆</h3>
              <p className="text-xs text-muted-foreground">AI 从你的对话中学到的偏好和关注点</p>
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
            </div>
          </section>

          {/* 🔔 通知偏好 */}
          <section id="notifications" className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-1">🔔 通知偏好</h2>
            <p className="text-sm text-muted-foreground mb-4">控制各类通知的开关</p>
            <div className="space-y-4">
              {notifLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : (
                ([
                  { key: "fileUpdates", label: "文件更新通知", desc: "文件上传、解析完成时通知" },
                  { key: "aiAnalysis", label: "AI 分析完成通知", desc: "AI 摘要、知识图谱生成完成时通知" },
                  { key: "storageWarning", label: "存储用量预警", desc: "存储空间即将用完时通知" },
                  { key: "systemAnnouncements", label: "系统公告", desc: "产品更新、维护公告等" },
                ] as const).map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs[item.key]}
                      disabled={notifSaving}
                      onClick={() => handleNotifToggle(item.key, !notifPrefs[item.key])}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifPrefs[item.key] ? "bg-blue-600" : "bg-muted-foreground/30"
                      } ${notifSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          notifPrefs[item.key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 🔒 安全 */}
          <section id="security" className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-1">🔒 安全</h2>
            <p className="text-sm text-muted-foreground mb-4">修改密码与登录信息管理</p>
            <div className="space-y-4">
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
              <div className="border-t pt-4">
                <Button variant="outline" className="w-full" onClick={() => signOut({ callbackUrl: "/" })}>
                  退出登录
                </Button>
              </div>
            </div>
          </section>

          {/* 💾 数据管理 */}
          <section id="data" className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-1">💾 数据管理</h2>
            <p className="text-sm text-muted-foreground mb-4">存储用量、数据导出与账号操作</p>
            <div className="space-y-4">
              {/* Usage */}
              {usageLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                </div>
              ) : usageError ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-sm text-destructive">获取数据失败，请刷新重试</p>
                  <Button size="sm" variant="outline" onClick={fetchUsage}>重试</Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      存储空间：{storageUsed} GB / {storageTotal} GB
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${storageUsed && storageTotal ? (parseFloat(storageUsed) / parseFloat(storageTotal)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    今日对话：{chatUsedToday} / {chatLimitToday} 次
                  </p>
                </>
              )}

              <div className="border-t pt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleExport}>导出数据</Button>
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
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
