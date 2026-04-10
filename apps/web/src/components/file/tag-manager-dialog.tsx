"use client"

import { useState } from "react"
import { X, Plus, Check, Minus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTags, useFileTags, useMultiFileTags, useCreateTag, useAddTagToFile, useRemoveTagFromFile } from "@/hooks/use-tags"
import { cn } from "@/lib/utils"

const TAG_COLORS = [
  "#4F5BD5", "#E5484D", "#F76808", "#FFB224",
  "#30A46C", "#0091FF", "#7C66DC", "#E93D82",
]

interface TagManagerDialogProps {
  fileId: string | null
  fileIds?: string[]
  fileName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagManagerDialog({ fileId, fileIds, fileName, open, onOpenChange }: TagManagerDialogProps) {
  const isMulti = !!(fileIds && fileIds.length > 1)
  const effectiveFileId = isMulti ? null : fileId
  const effectiveFileIds = isMulti ? fileIds : []

  const { data: allTags = [] } = useTags()
  const { data: fileTags = [] } = useFileTags(effectiveFileId)
  const multiFileTagsResult = useMultiFileTags(effectiveFileIds)
  const createTag = useCreateTag()
  const addTag = useAddTagToFile()
  const removeTag = useRemoveTagFromFile()

  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])

  // Single-file mode: simple set
  const fileTagIds = new Set(fileTags.map((t) => t.id))

  // Multi-file mode: compute tag counts across all files
  const multiTagCounts = new Map<string, number>()
  if (isMulti) {
    for (const tags of multiFileTagsResult) {
      for (const t of tags) {
        multiTagCounts.set(t.id, (multiTagCounts.get(t.id) || 0) + 1)
      }
    }
  }

  type TagState = "all" | "some" | "none"
  const getTagState = (tagId: string): TagState => {
    if (isMulti) {
      const count = multiTagCounts.get(tagId) || 0
      if (count === 0) return "none"
      if (count === effectiveFileIds.length) return "all"
      return "some"
    }
    return fileTagIds.has(tagId) ? "all" : "none"
  }

  const handleToggleTag = (tagId: string) => {
    if (isMulti) {
      const state = getTagState(tagId)
      // If all or some have it, remove from all; if none, add to all
      if (state === "all") {
        for (const fid of effectiveFileIds) {
          removeTag.mutate({ fileId: fid, tagId })
        }
      } else {
        // Add to files that don't have it
        const filesWithTag = new Set<string>()
        multiFileTagsResult.forEach((tags, i) => {
          if (tags.some((t) => t.id === tagId)) filesWithTag.add(effectiveFileIds[i])
        })
        for (const fid of effectiveFileIds) {
          if (!filesWithTag.has(fid)) {
            addTag.mutate({ fileId: fid, tagId })
          }
        }
      }
      return
    }
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
          if (tag?.id) {
            if (isMulti) {
              for (const fid of effectiveFileIds) {
                addTag.mutate({ fileId: fid, tagId: tag.id })
              }
            } else if (fileId) {
              addTag.mutate({ fileId, tagId: tag.id })
            }
          }
        },
      }
    )
  }

  const dialogTitle = isMulti
    ? `管理标签 — ${effectiveFileIds.length} 个文件`
    : `管理标签${fileName ? ` — ${fileName}` : ""}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {/* Existing tags */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">点击标签添加或移除</p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
            {allTags.map((tag: any) => {
              const state = getTagState(tag.id)
              const isOn = state === "all"
              const isPartial = state === "some"
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border",
                    isOn || isPartial
                      ? "border-transparent shadow-sm"
                      : "border-border opacity-60 hover:opacity-100"
                  )}
                  style={{
                    backgroundColor: isOn ? tag.color + "25" : isPartial ? tag.color + "15" : "transparent",
                    color: tag.color,
                    borderColor: isOn ? tag.color + "40" : isPartial ? tag.color + "30" : undefined,
                  }}
                >
                  {isOn && <Check className="h-3 w-3" />}
                  {isPartial && <Minus className="h-3 w-3" />}
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
