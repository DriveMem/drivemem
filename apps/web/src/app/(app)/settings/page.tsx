"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Download, Trash2, User } from "lucide-react"

export default function SettingsPage() {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user?.name || "")
  const [deleteConfirm, setDeleteConfirm] = useState("")

  // Mock usage data
  const storageUsed = 1.2
  const storageLimit = 5
  const chatCount = 8
  const chatLimit = 20
  const storagePercent = (storageUsed / storageLimit) * 100
  const chatPercent = (chatCount / chatLimit) * 100

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">设置</h1>

      <Card>
        <CardHeader><CardTitle>个人信息</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><User className="h-8 w-8 text-muted-foreground" /></div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="name">姓名</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div><Label>邮箱</Label><p className="text-sm text-muted-foreground mt-1">{session?.user?.email || "未登录"}</p></div>
          <Button size="sm">保存</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>用量</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>AI 记忆空间</span><span>{storageUsed} GB / {storageLimit} GB</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: storagePercent + "%" }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>今日对话次数</span><span>{chatCount} / {chatLimit}</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: chatPercent + "%" }} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>数据</CardTitle><CardDescription>导出或删除你的数据</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />导出所有数据</Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />删除账号</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>确认删除账号</DialogTitle><DialogDescription>此操作不可撤销。你的所有文件、对话和数据将被永久删除。输入 "DELETE" 确认。</DialogDescription></DialogHeader>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder='输入 "DELETE" 确认' />
              <DialogFooter><Button variant="destructive" disabled={deleteConfirm !== "DELETE"}>永久删除</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
