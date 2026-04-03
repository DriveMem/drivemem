"use client"
import { useState } from "react"
import { Files, Folder, FileText, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFolders, useFiles } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

export interface ScopeValue {
  type: "all" | "folder" | "file"
  id?: string
  name?: string
}

export function ScopeSelector({ value, onChange }: { value: ScopeValue; onChange: (v: ScopeValue) => void }) {
  const { data: folders } = useFolders()
  const { data: files } = useFiles()
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <span className="text-xs text-muted-foreground">对话范围：</span>

      <Button variant={value.type === "all" ? "secondary" : "ghost"} size="sm" onClick={() => onChange({ type: "all" })} className="gap-1 text-xs">
        <Files className="h-3 w-3" />全部文件
      </Button>

      {/* Folder picker */}
      <DropdownMenu open={showFolderPicker} onOpenChange={setShowFolderPicker}>
        <DropdownMenuTrigger asChild>
          <Button variant={value.type === "folder" ? "secondary" : "ghost"} size="sm" className="gap-1 text-xs">
            <Folder className="h-3 w-3" />
            {value.type === "folder" && value.name ? value.name : "指定文件夹"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-60 overflow-auto">
          {folders && folders.length > 0 ? folders.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => { onChange({ type: "folder", id: f.id, name: f.name }); setShowFolderPicker(false) }}>
              <Folder className="mr-2 h-3.5 w-3.5 text-muted-foreground" />{f.name}
            </DropdownMenuItem>
          )) : <DropdownMenuItem disabled>暂无文件夹</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* File picker */}
      <DropdownMenu open={showFilePicker} onOpenChange={setShowFilePicker}>
        <DropdownMenuTrigger asChild>
          <Button variant={value.type === "file" ? "secondary" : "ghost"} size="sm" className="gap-1 text-xs">
            <FileText className="h-3 w-3" />
            {value.type === "file" && value.name ? <span className="max-w-24 truncate">{value.name}</span> : "指定文件"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-60 overflow-auto w-64">
          {files && files.length > 0 ? files.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => { onChange({ type: "file", id: f.id, name: f.name }); setShowFilePicker(false) }}>
              <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{f.name}</span>
            </DropdownMenuItem>
          )) : <DropdownMenuItem disabled>暂无文件</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear scope indicator */}
      {value.type !== "all" && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange({ type: "all" })}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
