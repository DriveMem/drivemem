"use client"
import { FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CitationData { index?: number; filename?: string; snippet?: string; fileId?: string; fileName?: string; chunkIndex?: number; text?: string }

export function Citation({ citation, idx }: { citation: CitationData; idx?: number }) {
  const displayIndex = citation.index ?? citation.chunkIndex ?? idx ?? 0
  const displayName = citation.filename || citation.fileName || "未知文件"
  const displaySnippet = citation.snippet || citation.text || ""

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <FileText className="h-3 w-3" />
            <span>[{displayIndex + 1}] {displayName}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-medium mb-1">{displayName}</p>
          <p className="text-xs text-muted-foreground line-clamp-3">{displaySnippet}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function InlineCitation({ index }: { index: number }) {
  return <sup className="text-primary cursor-pointer hover:underline text-[10px] mx-0.5">[{index}]</sup>
}
