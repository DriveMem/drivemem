"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { mockFiles } from "@/lib/mock-data"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索文件、导航、操作…" />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>

        <CommandGroup heading="文件">
          {mockFiles.slice(0, 5).map((f) => (
            <CommandItem
              key={f.id}
              onSelect={() => navigate(`/files/${f.id}/preview`)}
            >
              {f.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="导航">
          <CommandItem onSelect={() => navigate("/files")}>我的文件</CommandItem>
          <CommandItem onSelect={() => navigate("/chat")}>AI 对话</CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>设置</CommandItem>
        </CommandGroup>

        <CommandGroup heading="操作">
          <CommandItem onSelect={() => navigate("/files")}>上传文件</CommandItem>
          <CommandItem onSelect={() => navigate("/files")}>新建文件夹</CommandItem>
          <CommandItem onSelect={() => navigate("/chat")}>新对话</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
