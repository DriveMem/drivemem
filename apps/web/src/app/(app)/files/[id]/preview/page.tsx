"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useFile, useMoveFile } from "@/hooks/use-files"
import { useFolders } from "@/hooks/use-folders"
import { apiFetch } from "@/lib/api"
import { Loader2, FileText, ArrowLeft, AlertCircle, Download } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"

const MarkdownRenderer = dynamic(() => import("react-markdown").then(mod => mod.default), { ssr: false, loading: () => <div className="animate-pulse h-96 bg-muted rounded" /> })

function getFileType(name: string, mimeType?: string): string {
  const ext = name?.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf") return "pdf"
  if (ext === "md" || ext === "markdown") return "md"
  if (ext === "txt") return "txt"
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image"
  if (/^(docx?|pptx?|xlsx?)$/.test(ext)) return "office"
  if (mimeType && (mimeType.includes("officedocument") || mimeType.includes("msword") || mimeType.includes("ms-powerpoint") || mimeType.includes("ms-excel"))) return "office"
  return "other"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(status: string): string {
  switch (status) {
    case "indexed": return "✅ AI Remembered"
    case "processing": return "🔄 AI Remembering..."
    case "failed": return "❌ Processing failed"
    case "uploaded": return "⏳ Pending"
    default: return status || "Unknown"
  }
}

function useFileContent(fileId: string, fileType: string) {
  const [content, setContent] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId || !["md", "txt", "pdf"].includes(fileType)) return

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const res = await apiFetch(`/api/files/${fileId}/preview-url`)
        const { previewUrl: url } = res as { previewUrl: string; mimeType: string }
        if (!cancelled) setPreviewUrl(url)
        if (fileType === "pdf") {
          // For PDF, we only need the URL for iframe
          if (!cancelled) setLoading(false)
          return
        }
        const textRes = await fetch(url)
        if (!textRes.ok) throw new Error(`Failed to load file content (${textRes.status})`)
        const text = await textRes.text()
        if (!cancelled) setContent(text)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load file content")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [fileId, fileType])

  return { content, previewUrl, loading, error }
}

function OfficePreview({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiFetch(`/api/files/${fileId}/preview-url`) as { previewUrl: string }
        if (!cancelled && res.previewUrl) {
          // Try Microsoft Office Online Viewer first (more reliable with presigned URLs)
          setPreviewUrl(`https://docs.google.com/viewer?url=${encodeURIComponent(res.previewUrl)}&embedded=true`)
        } else {
          if (!cancelled) setError(true)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fileId])

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded border bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !previewUrl) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-xl border bg-muted/50">
        <FileText className="h-16 w-16 text-muted-foreground/50" />
        <div className="text-center">
          <p className="text-sm font-medium">Office FilesPreview</p>
          <p className="text-xs text-muted-foreground mt-1">Cannot preview this file online, please download to view</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const res = await apiFetch(`/api/files/${fileId}/preview-url`) as { previewUrl: string }
              if (res.previewUrl) {
                const a = document.createElement("a")
                a.href = res.previewUrl
                a.download = fileName
                a.target = "_blank"
                a.click()
              }
            } catch {
              alert("Failed to get download link")
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />Download file
        </Button>
      </div>
    )
  }

  return (
    <iframe
      src={previewUrl}
      className="w-full h-[600px] rounded border-0"
      title={fileName}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  )
}

function ImagePreview({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/files/${fileId}/preview-url`)
      .then((res: any) => setUrl(res.previewUrl))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fileId])

  if (loading) return <div className="flex h-96 items-center justify-center rounded border bg-muted"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!url) return <div className="flex h-96 items-center justify-center rounded border bg-muted text-muted-foreground"><p>Failed to load image</p></div>

  return (
    <div className="flex items-center justify-center rounded border bg-muted/30 p-4">
      <img src={url} alt={fileName} className="max-h-[600px] max-w-full object-contain rounded" />
    </div>
  )
}

export default function FilePreviewPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading, error } = useFile(params.id)
  const moveFile = useMoveFile()
  const { data: foldersData } = useFolders()
  const allFolders = foldersData?.folders || []

  // Handle both { file: {...} } and direct object — computed before hooks to keep hook order stable
  const file = (!isLoading && !error) ? (data?.file || data) : null
  const fileType = file ? getFileType(file.name || file.originalName || "", file.mimeType) : "other"
  const fileName = file ? (file.name || file.originalName || "Untitled file") : ""

  // All hooks must be called unconditionally (React rules of hooks)
  const { content, previewUrl, loading: contentLoading, error: contentError } = useFileContent(params.id, fileType)

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Filesdoes not exist or failed to load</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">BackFilesList</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{fileName}</h1>
      </div>

      {/* AI Summary */}
      {file.summary && (
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
          <h2 className="font-semibold mb-2">🧠 AI Summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{file.summary}</p>
        </div>
      )}

      {/* AI Classification Suggestion */}
      {file.suggestedFolder && !file.folderId && (
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 flex items-center justify-between">
          <span className="text-sm">💡 AI Suggested folder: <strong>{file.suggestedFolder}</strong></span>
          <Button
            size="sm"
            onClick={() => {
              const matched = allFolders.find((f: any) => f.name === file.suggestedFolder)
              if (matched) {
                moveFile.mutate({ fileId: file.id, folderId: matched.id })
              } else {
                alert("Please create this folder first")
              }
            }}
          >
            Move to
          </Button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Main preview area */}
        <div className="flex-1">
          {fileType === "pdf" && (
            previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[600px] rounded border" title="PDF Preview" />
            ) : contentLoading ? (
              <div className="flex h-96 items-center justify-center rounded border bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center gap-3 rounded border bg-muted text-muted-foreground">
                <FileText className="h-12 w-12" />
                <p>PDF Files — AI Remembered content</p>
                <p className="text-xs">You can ask questions about this file in AI conversations</p>
              </div>
            )
          )}
          {(fileType === "md" || fileType === "txt") && (
            <>
              {contentLoading && (
                <div className="flex h-96 items-center justify-center rounded border bg-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {contentError && (
                <div className="flex h-96 flex-col items-center justify-center gap-3 rounded border bg-muted text-muted-foreground">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p>Cannot preview file content</p>
                  <p className="text-xs text-destructive">{contentError}</p>
                </div>
              )}
              {!contentLoading && !contentError && content !== null && (
                <div className="min-h-96 overflow-auto rounded border bg-background p-6">
                  {fileType === "md" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownRenderer>{content}</MarkdownRenderer>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</pre>
                  )}
                </div>
              )}
            </>
          )}
          {fileType === "office" && (
            <OfficePreview fileId={params.id} fileName={fileName} />
          )}
          {fileType === "other" && (
            <div className="flex h-96 flex-col items-center justify-center gap-4 rounded border bg-muted text-muted-foreground">
              <FileText className="h-12 w-12" />
              <p>{(file.mimeType || "Unknown type").toUpperCase()} Files</p>
              <p className="text-xs">AI Remembered this file's content. You can ask about it in conversations</p>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await apiFetch(`/api/files/${params.id}/preview-url`) as { previewUrl: string }
                    if (res.previewUrl) {
                      const a = document.createElement("a")
                      a.href = res.previewUrl
                      a.download = fileName
                      a.target = "_blank"
                      a.click()
                    }
                  } catch {
                    alert("Failed to get download link")
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />Download file
              </Button>
            </div>
          )}
          {fileType === "image" && (
            <ImagePreview fileId={params.id} fileName={fileName} />
          )}
        </div>

        {/* File info sidebar */}
        <Card className="w-72 shrink-0">
          <CardContent className="space-y-4 p-4">
            <h2 className="font-semibold">FilesInfo</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Filename</dt>
                <dd className="break-all">{fileName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{file.mimeType || fileType.toUpperCase()}</dd>
              </div>
              {file.size && (
                <div>
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{formatSize(file.size)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{statusLabel(file.status || file.parseStatus)}</dd>
              </div>
              {file.errorMessage && (
                <div>
                  <dt className="text-muted-foreground">Error</dt>
                  <dd className="text-destructive">{file.errorMessage}</dd>
                </div>
              )}
              {file.createdAt && (
                <div>
                  <dt className="text-muted-foreground">UploadTime</dt>
                  <dd>{new Date(file.createdAt).toLocaleString("zh-CN")}</dd>
                </div>
              )}
            </dl>
            <div className="flex gap-2">
              <Button className="flex-1" asChild>
                <Link href={`/chat?fileIds=${file.id}`}>💬 Ask AI about this file</Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Download original file"
                onClick={async () => {
                  try {
                    const res = await apiFetch(`/api/files/${params.id}/preview-url`) as { previewUrl: string }
                    const a = document.createElement("a")
                    a.href = res.previewUrl
                    a.download = fileName
                    a.target = "_blank"
                    a.click()
                  } catch {
                    alert("Failed to get download link")
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
