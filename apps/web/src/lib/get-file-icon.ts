import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Presentation,
  type LucideIcon,
} from "lucide-react"

export interface FileIconInfo {
  icon: LucideIcon
  colorClass: string
}

const EXT_MAP: Record<string, FileIconInfo> = {
  pdf: { icon: FileText, colorClass: "text-red-500" },
  doc: { icon: FileText, colorClass: "text-blue-500" },
  docx: { icon: FileText, colorClass: "text-blue-500" },
  ppt: { icon: Presentation, colorClass: "text-orange-500" },
  pptx: { icon: Presentation, colorClass: "text-orange-500" },
  xls: { icon: FileSpreadsheet, colorClass: "text-green-500" },
  xlsx: { icon: FileSpreadsheet, colorClass: "text-green-500" },
  md: { icon: FileText, colorClass: "text-gray-500" },
  markdown: { icon: FileText, colorClass: "text-gray-500" },
  jpg: { icon: FileImage, colorClass: "text-purple-500" },
  jpeg: { icon: FileImage, colorClass: "text-purple-500" },
  png: { icon: FileImage, colorClass: "text-purple-500" },
  gif: { icon: FileImage, colorClass: "text-purple-500" },
  webp: { icon: FileImage, colorClass: "text-purple-500" },
  svg: { icon: FileImage, colorClass: "text-purple-500" },
  txt: { icon: FileText, colorClass: "text-gray-400" },
}

const MIME_PREFIX_MAP: Array<[string, FileIconInfo]> = [
  ["application/pdf", { icon: FileText, colorClass: "text-red-500" }],
  ["application/msword", { icon: FileText, colorClass: "text-blue-500" }],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml", { icon: FileText, colorClass: "text-blue-500" }],
  ["application/vnd.ms-powerpoint", { icon: Presentation, colorClass: "text-orange-500" }],
  ["application/vnd.openxmlformats-officedocument.presentationml", { icon: Presentation, colorClass: "text-orange-500" }],
  ["application/vnd.ms-excel", { icon: FileSpreadsheet, colorClass: "text-green-500" }],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml", { icon: FileSpreadsheet, colorClass: "text-green-500" }],
  ["image/", { icon: FileImage, colorClass: "text-purple-500" }],
  ["text/markdown", { icon: FileText, colorClass: "text-gray-500" }],
]

const DEFAULT_ICON: FileIconInfo = { icon: File, colorClass: "text-muted-foreground" }

export function getFileIcon(nameOrExt?: string, mimeType?: string): FileIconInfo {
  // Try extension first
  if (nameOrExt) {
    const ext = nameOrExt.includes(".") ? nameOrExt.split(".").pop()?.toLowerCase() : nameOrExt.toLowerCase()
    if (ext && EXT_MAP[ext]) return EXT_MAP[ext]
  }

  // Try MIME type
  if (mimeType) {
    for (const [prefix, info] of MIME_PREFIX_MAP) {
      if (mimeType.startsWith(prefix)) return info
    }
  }

  return DEFAULT_ICON
}
