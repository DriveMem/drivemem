"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLayoutStore } from "@/stores/layout-store"
import { FileInspector } from "@/components/file/file-inspector"

export function InspectorPanel() {
  const { closeInspector, selectedFileId } = useLayoutStore()
  return (
    <div className="flex h-full w-[360px] flex-col">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-medium">FilesDetails</span>
        <Button variant="ghost" size="icon" onClick={closeInspector} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        {selectedFileId ? (
          <FileInspector fileId={selectedFileId} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Select a file to view details</div>
        )}
      </div>
    </div>
  )
}
