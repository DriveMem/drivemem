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

function getFileType(name: string): string {
  const ext = name?.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf") return "pdf"
  if (ext === "md" || ext === "markdown") return "md"
  if (ext === "txt") return "txt"
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image"
  if (["docx", "doc", "pptx", "ppt", "xlsx", "xls"].includes(ext)) return "office"
  return "other"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(status: string): string {
  switch (status) {
    case "indexed": return "✅ AI 已记住"
    case "processing": return "🔄 AI 正在记住..."
    case "failed": return "❌ 处理失败"
    case "uploaded": return "⏳ 等待处理"
    default: return status || "未知"
  }
}

function useFileContent(fileId: string, fileType: string) {
  const [content, setContent] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId || !["md", "txt", "pdf", "office"].includes(fileType)) return

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const res = await apiFetch(`/api/files/${fileId}/preview-url`)
        const { previewUrl: url } = res as { previewUrl: string; mimeType: string }
        if (!cancelled) setPreviewUrl(url)
        if (fileType === "pdf" || fileType === "office") {
          // For PDF and Office, we only need the URL for iframe
          if (!cancelled) setLoading(false)
          return
        }
        const textRes = await fetch(url)
        if (!textRes.ok) throw new Error(`获取文件内容失败 (${textRes.status})`)
        const text = await textRes.text()
        if (!cancelled) setContent(text)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "无法加载文件内容")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [fileId, fileType])

  return { content, previewUrl, loading, error }
}

export default function FilePreviewPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading, error } = useFile(params.id)
  const moveFile = useMoveFile()
  const { data: foldersData } = useFolders()
  const allFolders = foldersData?.folders || []

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Handle both { file: {...} } and direct object
  const file = data?.file || data
  if (error || !file) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>文件不存在或加载失败</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">返回文件列表</Link>
        </Button>
      </div>
    )
  }

  const fileType = getFileType(file.name || file.originalName || "")
  const fileName = file.name || file.originalName || "未命名文件"
  const { content, previewUrl, loading: contentLoading, error: contentError } = useFileContent(params.id, fileType)

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
          <h2 className="font-semibold mb-2">🧠 AI 摘要</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{file.summary}</p>
        </div>
      )}

      {/* AI Classification Suggestion */}
      {file.suggestedFolder && !file.folderId && (
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 flex items-center justify-between">
          <span className="text-sm">💡 AI 建议将此文件归入：<strong>{file.suggestedFolder}</strong></span>
          <Button
            size="sm"
            onClick={() => {
              const matched = allFolders.find((f: any) => f.name === file.suggestedFolder)
              if (matched) {
                moveFile.mutate({ fileId: file.id, folderId: matched.id })
              } else {
                alert("请先创建此文件夹")
              }
            }}
          >
            移入
          </Button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Main preview area */}
        <div className="flex-1">
          {fileType === "pdf" && (
            previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[600px] rounded border" title="PDF 预览" />
            ) : contentLoading ? (
              <div className="flex h-96 items-center justify-center rounded border bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center gap-3 rounded border bg-muted text-muted-foreground">
                <FileText className="h-12 w-12" />
                <p>PDF 文件 — AI 已记住内容</p>
                <p className="text-xs">可在 AI 对话中询问此文件相关问题</p>
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
                  <p>无法预览文件内容</p>
                  <p className="text-xs text-destructive">{contentError}</p>
                </div>
              )}
              {!contentLoading && !contentError && content !== null && (
                <div className="min-h-96 overflow-auto rounded border bg-background p-6">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</pre>
                </div>
              )}
            </>
          )}
          {fileType === "office" && (
            previewUrl ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                className="w-full h-[600px] rounded border"
                title="Office 文件预览"
              />
            ) : contentLoading ? (
              <div className="flex h-96 items-center justify-center rounded border bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center gap-3 rounded border bg-muted text-muted-foreground">
                <FileText className="h-12 w-12" />
                <p>Office 文件 — AI 已记住内容</p>
                <p className="text-xs">可在 AI 对话中询问此文件相关问题</p>
              </div>
            )
          )}
          {fileType === "other" && (
            <div className="flex h-96 flex-col items-center justify-center gap-3 rounded border bg-muted text-muted-foreground">
              <FileText className="h-12 w-12" />
              <p>{(file.mimeType || "未知类型").toUpperCase()} 文件</p>
              <p className="text-xs">AI 已记住此文件内容，可在对话中提问</p>
            </div>
          )}
          {fileType === "image" && (
            <div className="flex h-96 items-center justify-center rounded border bg-muted text-muted-foreground">
              <p>图片预览暂不支持</p>
            </div>
          )}
        </div>

        {/* File info sidebar */}
        <Card className="w-72 shrink-0">
          <CardContent className="space-y-4 p-4">
            <h2 className="font-semibold">文件信息</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">文件名</dt>
                <dd className="break-all">{fileName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">类型</dt>
                <dd>{file.mimeType || fileType.toUpperCase()}</dd>
              </div>
              {file.size && (
                <div>
                  <dt className="text-muted-foreground">大小</dt>
                  <dd>{formatSize(file.size)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">状态</dt>
                <dd>{statusLabel(file.status || file.parseStatus)}</dd>
              </div>
              {file.errorMessage && (
                <div>
                  <dt className="text-muted-foreground">错误</dt>
                  <dd className="text-destructive">{file.errorMessage}</dd>
                </div>
              )}
              {file.createdAt && (
                <div>
                  <dt className="text-muted-foreground">上传时间</dt>
                  <dd>{new Date(file.createdAt).toLocaleString("zh-CN")}</dd>
                </div>
              )}
            </dl>
            <div className="flex gap-2">
              <Button className="flex-1" asChild>
                <Link href={`/chat?file=${file.id}`}>对此文件提问</Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="下载原文件"
                onClick={async () => {
                  try {
                    const res = await apiFetch(`/api/files/${params.id}/preview-url`) as { previewUrl: string }
                    const a = document.createElement("a")
                    a.href = res.previewUrl
                    a.download = fileName
                    a.target = "_blank"
                    a.click()
                  } catch {
                    alert("获取下载链接失败")
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Related Files */}
      <RelatedFiles fileId={params.id} />
    </div>
  )
}

function RelatedFiles({ fileId }: { fileId: string }) {
  const [links, setLinks] = useState<any[]>([])
  const [fallbackFiles, setFallbackFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/users/me/knowledge-links`)
      .then((data: any) => {
        const all = data?.links || []
        const related = all
          .filter((l: any) => l.fileAId === fileId || l.fileBId === fileId)
          .slice(0, 5)
        setLinks(related)
        // If no knowledge links, fallback to /api/files
        if (related.length === 0) {
          return apiFetch(`/api/files`).then((filesData: any) => {
            const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])
            setFallbackFiles(files.filter((f: any) => f.id !== fileId).slice(0, 4))
          })
        }
      })
      .catch(() => {
        // On error, try fallback
        apiFetch(`/api/files`).then((filesData: any) => {
          const files = Array.isArray(filesData) ? filesData : (filesData?.files || [])
          setFallbackFiles(files.filter((f: any) => f.id !== fileId).slice(0, 4))
        }).catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [fileId])

  if (loading) return null

  const relationLabels: Record<string, string> = {
    similar: "相似",
    complementary: "互补",
    contradictory: "矛盾",
    reference: "引用",
  }

  const relationIcons: Record<string, string> = {
    similar: "🔗",
    complementary: "🤝",
    contradictory: "⚡",
    reference: "📎",
  }

  const hasLinks = links.length > 0
  const hasFallback = fallbackFiles.length > 0

  if (!hasLinks && !hasFallback) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">📎 相关文件</h2>
        <p className="text-sm text-muted-foreground">暂无相关文件</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">📎 相关文件</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {hasLinks ? links.map((l: any) => {
          const isA = l.fileAId === fileId
          const otherName = isA ? l.fileBName : l.fileAName
          const otherId = isA ? l.fileBId : l.fileAId
          const icon = relationIcons[l.relationType] || "🔗"
          const label = relationLabels[l.relationType] || l.relationType

          return (
            <Link
              key={l.id}
              href={`/files/${otherId}/preview`}
              className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition group"
            >
              <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition">{otherName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {icon} {label}
                  {l.score != null && <span className="ml-2">相似度 {Math.round(l.score * 100)}%</span>}
                </p>
                {l.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>
                )}
              </div>
            </Link>
          )
        }) : fallbackFiles.map((f: any) => {
          const name = f.name || f.originalName || "未命名文件"
          const ext = name.split(".").pop()?.toLowerCase() || ""
          return (
            <Link
              key={f.id}
              href={`/files/${f.id}/preview`}
              className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition group"
            >
              <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition">{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ext.toUpperCase() || "文件"}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
