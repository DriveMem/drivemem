"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, Copy, Check, FileText, Upload, AlertCircle, Loader2, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { useFolders } from "@/hooks/use-folders"
import { useFiles } from "@/hooks/use-files"
import { useTags } from "@/hooks/use-tags"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface CompileSource {
  fileId?: string
  fileName: string
  similarity?: number
  snippet?: string
}

interface CompileResult {
  context: string
  sources: CompileSource[]
  tokenCount?: number
  model?: string
}

function CompileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const prefilledProject = searchParams.get("project") || ""

  const [task, setTask] = useState("")
  const [selectedProject, setSelectedProject] = useState(prefilledProject)
  const [selectedTags, setSelectedTags] = useState("")
  const [result, setResult] = useState<CompileResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  const { data: foldersData } = useFolders()
  const { data: filesData } = useFiles()
  const { data: tags = [] } = useTags()

  const folders = foldersData?.folders || []
  const files = Array.isArray(filesData) ? filesData : (filesData as any)?.files || []
  const hasFiles = files.length > 0

  useEffect(() => {
    document.title = "Compile Context - DriveMem"
  }, [])

  useEffect(() => {
    setSelectedProject(prefilledProject)
  }, [prefilledProject])

  const handleCompile = useCallback(async () => {
    if (!task.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const body: Record<string, any> = { task: task.trim() }
      if (selectedProject) body.project = selectedProject
      if (selectedTags) body.tags = selectedTags
      const data = await apiFetch("/api/v1/context/compile", {
        method: "POST",
        body: JSON.stringify(body),
      })
      setResult(data)
    } catch (err: any) {
      if (err?.status === 503 || err?.message?.toLowerCase().includes("unavailable")) {
        setError("AI service temporarily unavailable. Please try again later.")
      } else {
        setError(err?.message || "Failed to compile context. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }, [task, selectedProject, selectedTags])

  const copyToClipboard = async (text: string, type: "all" | string) => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "all") {
        setCopiedAll(true)
        setTimeout(() => setCopiedAll(false), 2000)
      } else {
        setCopiedSnippet(type)
        setTimeout(() => setCopiedSnippet(null), 2000)
      }
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy")
    }
  }

  // Empty state: no files
  if (!hasFiles) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Upload files first to compile context</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Context Compiler needs files in your knowledge base to work with. Upload some documents to get started.
        </p>
        <Button onClick={() => router.push("/files")}>
          <Upload className="h-4 w-4 mr-2" />
          Go to Files
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-[#4F5BD5]" />
          <h1 className="text-2xl font-bold">Compile Context</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe your task and get a compiled context packet from your knowledge base — ready to paste into any AI.
        </p>
      </div>

      {/* Input area */}
      <div className="rounded-xl border border-border p-4 mb-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Task description</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what you're working on... e.g. 'Write a competitive analysis report for Q2'"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition min-h-[100px] resize-y focus:border-[#4F5BD5] focus:ring-2 focus:ring-[#4F5BD5]/20"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#4F5BD5]"
            >
              <option value="">All projects</option>
              {folders.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
            <select
              value={selectedTags}
              onChange={(e) => setSelectedTags(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#4F5BD5]"
            >
              <option value="">Any tag</option>
              {tags.map((t: any) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleCompile}
            disabled={!task.trim() || loading}
            className="bg-[#4F5BD5] hover:bg-[#3D49C4] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Compiling...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Compile Context
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-xl border border-border p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#4F5BD5]" />
            <span className="text-sm font-medium text-[#4F5BD5]">Compiling context from your knowledge base...</span>
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Check your AI service configuration or try again later.</p>
          </div>
        </div>
      )}

      {/* No results state */}
      {result && !result.context && !result.sources?.length && !loading && (
        <div className="rounded-xl border border-border p-6 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">No relevant knowledge found</p>
          <p className="text-xs text-muted-foreground">Try a different description or upload more files to your knowledge base.</p>
        </div>
      )}

      {/* Results */}
      {result && (result.context || result.sources?.length > 0) && !loading && (
        <div className="space-y-4">
          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Sources ({result.sources.length} files{result.tokenCount ? `, ${(result.tokenCount / 1000).toFixed(1)}k tokens` : ""})
                </h3>
              </div>
              <div className="space-y-2">
                {result.sources.map((source, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/50 transition">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{source.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {source.similarity != null && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {(source.similarity).toFixed(2)}
                        </span>
                      )}
                      {source.snippet && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(source.snippet!, source.fileId || String(i))}
                        >
                          {copiedSnippet === (source.fileId || String(i)) ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compiled context */}
          {result.context && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Compiled Context</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(result.context, "all")}
                  className="h-8"
                >
                  {copiedAll ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy All
                    </>
                  )}
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted/30 p-4 overflow-auto max-h-[500px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.context}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CompilePage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading…</div>}>
      <CompileContent />
    </Suspense>
  )
}
