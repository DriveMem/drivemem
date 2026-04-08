"use client"

import { useState, useEffect } from "react"
import { getSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function ApiKeysCard() {
  const [keys, setKeys] = useState<any[]>([])
  const [keyName, setKeyName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const { apiFetch } = await import("@/lib/api")
        const data = await apiFetch("/api/api-keys")
        setKeys(data?.keys || [])
      } catch { /* ignore */ }
    }
    fetchKeys()
  }, [])

  const createKey = async () => {
    setCreating(true)
    try {
      const { apiFetch } = await import("@/lib/api")
      const data = await apiFetch("/api/api-keys", { method: "POST", body: JSON.stringify({ name: keyName.trim() }) })
      setNewKey(data.key)
      setKeyName("")
      const list = await apiFetch("/api/api-keys")
      setKeys(list?.keys || [])
      toast.success("API Key 已创建")
    } catch {
      toast.error("创建失败")
    } finally {
      setCreating(false)
    }
  }

  const deleteKey = async (id: string) => {
    try {
      const { apiFetch } = await import("@/lib/api")
      await apiFetch(`/api/api-keys/${id}`, { method: "DELETE" })
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success("已删除")
    } catch {
      toast.error("删除失败")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔑 API Keys</CardTitle>
        <CardDescription>创建 API Key 让 AI agent 接入你的知识库</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Key 名称（如 My Agent）" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          <Button onClick={createKey} disabled={!keyName.trim() || creating}>
            {creating ? "创建中..." : "创建 Key"}
          </Button>
        </div>

        {newKey && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-600 mb-2">⚠️ 请保存你的 API Key — 只显示一次</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono select-all">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("已复制") }}>
                复制
              </Button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">还没有 API Key</p>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}••••••••</p>
                  <p className="text-xs text-muted-foreground">
                    创建于 {new Date(k.createdAt).toLocaleDateString("zh-CN")}
                    {k.lastUsedAt && ` · 最后使用 ${new Date(k.lastUsedAt).toLocaleDateString("zh-CN")}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteKey(k.id)}>
                  删除
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          📖 API 文档：上传文件、搜索知识、AI 问答。详见 <a href="https://github.com/yufuche1/ai-drive#api" className="text-[#4F5BD5] hover:underline" target="_blank" rel="noopener noreferrer">GitHub README</a>
        </p>
      </CardContent>
    </Card>
  )
}

type SettingsTab = "general" | "developer"

export default function SettingsContent() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general")
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

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setSettingsTab("general")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${settingsTab === "general" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          ⚙️ 通用
        </button>
        <button
          onClick={() => setSettingsTab("developer")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${settingsTab === "developer" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          🔧 开发者
        </button>
      </div>

      {settingsTab === "developer" ? (
        <>
          <p className="text-sm text-muted-foreground">这些功能面向需要通过 API 或 AI Agent 接入的高级用户</p>
          <ApiKeysCard />
        </>
      ) : (
      <>

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
          <Button size="sm" className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white" onClick={() => toast.success("已保存")}>保存</Button>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>用量</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            {(() => {
              const pct = storageUsed !== "—" && storageTotal !== "—" ? (parseFloat(storageUsed) / parseFloat(storageTotal)) * 100 : 0
              const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-primary"
              const textColor = pct > 90 ? "text-red-500" : pct > 70 ? "text-yellow-600" : "text-muted-foreground"
              return (
                <>
                  <p className={`mb-1 text-sm ${textColor}`}>
                    存储空间：{storageUsed} GB / {storageTotal} GB {pct > 90 ? "⚠️ 即将用完" : pct > 70 ? "⚡ 接近上限" : ""}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              )
            })()}
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
            className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white"
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
      </>
      )}
    </div>
  )
}
