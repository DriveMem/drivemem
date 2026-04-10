"use client"

import { useState } from "react"
import { X, Plus, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTags, useFileTags, useCreateTag, useAddTagToFile, useRemoveTagFromFile } from "@/hooks/use-tags"
import { cn } from "@/lib/utils"

const TAG_COLORS = [
  "#4F5BD5", "#E5484D", "#F76808", "#FFB224",
  "#30A46C", "#0091FF", "#7C66DC", "#E93D82",
]

interface TagManagerDialogProps {
  fileId: string | null
  fileName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagManagerDialog({ fileId, fileName, open, onOpenChange }: TagManagerDialogProps) {
  const { data: allTags = [] } = useTags()
  const { data: fileTags = [] } = useFileTags(fileId)
  const createTag = useCreateTag()
  const addTag = useAddTagToFile()
  const removeTag = useRemoveTagFromFile()

  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])

  const fileTagIds = new Set(fileTags.map((t) => t.id))

  const handleToggleTag = (tagId: string) => {
    if (!fileId) return
    if (fileTagIds.has(tagId)) {
      removeTag.mutate({ fileId, tagId })
    } else {
      addTag.mutate({ fileId, tagId })
    }
  }

  const handleCreateTag = () => {
    const name = newTagName.trim()
    if (!name) return
    createTag.mutate(
      { name, color: newTagColor },
      {
        onSuccess: (tag: any) => {
          setNewTagName("")
          setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)])
          if (fileId && tag?.id) {
            addTag.mutate({ fileId, tagId: tag.id })
          }
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>管理标签{fileName ? ` — ${fileName}` : ""}</DialogTitle>
        </DialogHeader>

        {/* Existing tags */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">点击标签添加或移除</p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
            {allTags.map((tag: any) => {
              const isOn = fileTagIds.has(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border",
                    isOn
                      ? "border-transparent shadow-sm"
                      : "border-border opacity-60 hover:opacity-100"
                  )}
                  style={{
                    backgroundColor: isOn ? tag.color + "25" : "transparent",
                    color: tag.color,
                    borderColor: isOn ? tag.color + "40" : undefined,
                  }}
                >
                  {isOn && <Check className="h-3 w-3" />}
                  {tag.name}
                </button>
              )
            })}
            {allTags.length === 0 && (
              <p className="text-xs text-muted-foreground">还没有标签，创建一个吧</p>
            )}
          </div>
        </div>

        {/* Create new tag */}
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">创建新标签</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()} className="h-8 gap-1">
              <Plus className="h-3 w-3" /> 创建
            </Button>
          </div>
          <div className="flex gap-1.5">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className={cn(
                  "h-5 w-5 rounded-full transition-all",
                  newTagColor === color && "ring-2 ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundColor: color, boxShadow: newTagColor === color ? `0 0 0 2px ${color}` : undefined }}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
