"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const SHORTCUT_GROUPS = [
  {
    title: "文件管理",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "N"], description: "新建文件夹" },
      { keys: ["F2"], description: "重命名" },
      { keys: ["Ctrl", "Click"], description: "多选文件" },
      { keys: ["Shift", "Click"], description: "范围选择" },
    ],
  },
  {
    title: "对话",
    shortcuts: [
      { keys: ["Enter"], description: "发送消息" },
      { keys: ["Shift", "Enter"], description: "换行" },
    ],
  },
  {
    title: "通用",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "搜索" },
      { keys: ["?"], description: "快捷键帮助" },
      { keys: ["Ctrl", "/"], description: "快捷键帮助" },
      { keys: ["Esc"], description: "关闭弹窗" },
    ],
  },
]

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }

      if (e.key === "?" && !isInput) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⌨️ 快捷键</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <span key={j}>
                          {j > 0 && <span className="text-muted-foreground mx-0.5 text-xs">+</span>}
                          <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-mono text-muted-foreground">
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">按 Esc 关闭</p>
      </DialogContent>
    </Dialog>
  )
}
