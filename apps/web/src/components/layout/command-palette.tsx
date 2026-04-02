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
import { useFiles } from "@/hooks/use-files"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { data: filesData } = useFiles()
  const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])

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

  const [inputValue, setInputValue] = useState("")

  const handleSearchSubmit = () => {
    if (inputValue.trim()) {
      setOpen(false)
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="搜索文件、导航、操作…"
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={(e) => {
          if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault()
            handleSearchSubmit()
          }
        }}
      />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>

        {files.length > 0 && (
          <CommandGroup heading="文件">
            {files.slice(0, 5).map((f: any) => (
              <CommandItem
                key={f.id}
                value={`file-${f.id}-${f.name || f.originalName}`}
                onSelect={() => navigate(`/files/${f.id}/preview`)}
              >
                {f.name || f.originalName}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="导航">
          <CommandItem value="nav-dashboard" onSelect={() => navigate("/dashboard")}>我的文件</CommandItem>
          <CommandItem value="nav-chat" onSelect={() => navigate("/chat")}>AI 对话</CommandItem>
          <CommandItem value="nav-settings" onSelect={() => navigate("/settings")}>设置</CommandItem>
        </CommandGroup>

        <CommandGroup heading="操作">
          <CommandItem value="action-upload" onSelect={() => navigate("/dashboard")}>让 AI 记住文件</CommandItem>
          <CommandItem value="action-new-chat" onSelect={() => navigate("/chat")}>新对话</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
