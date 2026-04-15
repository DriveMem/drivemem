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
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface CompileSource {
  fileId: string
  fileName: string
  relevanceScore: number
  tokensUsed: number
}

interface CompileMetadata {
  sources: CompileSource[]
  coverage: "full" | "partial" | "insufficient"
  totalTokens: number
  tokenBudget: number
  compilationTimeMs: number
  fragmentCount: number
}

interface CompileResult {
  compiledContext: string
  metadata: CompileMetadata
}

const HISTORY_KEY = 'drivemem-briefing-history'
const MAX_HISTORY = 5

interface HistoryEntry {
  task: string
  timestamp: string
  fragmentCount: number
}

function saveToHistory(task: string, fragmentCount: number) {
  try {
    const history: HistoryEntry[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    history.unshift({ task, timestamp: new Date().toISOString(), fragmentCount })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch {}
}

function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const examples = [
  { icon: "📋", title: "Project handoff", desc: "Prepare context for a new team member or AI" },
  { icon: "📝", title: "Continue writing", desc: "Get background for a writing task" },
  { icon: "🔍", title: "Research review", desc: "Compile relevant knowledge for analysis" },
]

function CompileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const prefilledProject = searchParams.get("project") || ""

  const [task, setTask] = useState("")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedProject, setSelectedProject] = useState(prefilledProject)
  const [selectedTags, setSelectedTags] = useState("")
  const [result, setResult] = useState<CompileResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: foldersData } = useFolders()
  const { data: filesData } = useFiles()
  const { data: tags = [] } = useTags()

  const folders = foldersData?.folders || []
  const files = Array.isArray(filesData) ? filesData : (filesData as any)?.files || []
  const hasFiles = files.length > 0

  useEffect(() => {
    document.title = "Prepare a briefing for your AI - DriveMem"
  }, [])

  useEffect(() => {
    setSelectedProject(prefilledProject)
  }, [prefilledProject])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleCompile = useCallback(async () => {
    if (!task.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const tagsArray = selectedTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const data = await apiFetch("/api/v1/context/compile", {
        method: "POST",
        body: JSON.stringify({
          task: task.trim(),
          hints: {
            project: selectedProject || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined,
          },
          tokenBudget: 8000,
        }),
      })
      setResult(data)
      saveToHistory(task.trim(), data.metadata?.fragmentCount ?? 0)
      setHistory(getHistory())
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

  const copyContext = async () => {
    if (!result?.compiledContext) return
    try {
      await navigator.clipboard.writeText(result.compiledContext)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copied!")
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
    <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-[#4F5BD5]" />
          <h1 className="text-2xl font-bold">Prepare a briefing for your AI</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe your task — DriveMem finds the right knowledge for any AI
        </p>
      </div>

      {/* Input section */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 mb-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Task description</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe your task... e.g. 'Write a competitive analysis report for Q2'"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition min-h-[100px] resize-y focus:border-[#4F5BD5] focus:ring-2 focus:ring-[#4F5BD5]/20"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-end">
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma-separated)</label>
            <input
              type="text"
              value={selectedTags}
              onChange={(e) => setSelectedTags(e.target.value)}
              placeholder="e.g. decision, engineering"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#4F5BD5]"
            />
          </div>
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
                Generate Briefing
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Example scenario cards */}
      {!result && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {examples.map((ex) => (
            <button
              key={ex.title}
              onClick={() => setTask(ex.title)}
              className="rounded-xl border border-border bg-card p-4 text-left hover:border-[#4F5BD5]/50 hover:shadow-sm transition"
            >
              <span className="text-2xl mb-2 block">{ex.icon}</span>
              <span className="text-sm font-medium block">{ex.title}</span>
              <span className="text-xs text-muted-foreground">{ex.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Recent history */}
      {!result && !loading && history.length > 0 && (
        <div className="mb-6 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Recent</p>
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => setTask(h.task)}
              className="block w-full text-left rounded-lg px-3 py-1.5 text-sm hover:bg-muted/50 transition truncate"
            >
              <span className="text-foreground">{h.task}</span>
              <span className="text-xs text-muted-foreground ml-2">— {relativeTime(h.timestamp)}</span>
            </button>
          ))}
        </div>
      )}

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
      {result && !result.compiledContext && !result.metadata?.sources?.length && !loading && (
        <div className="rounded-xl border border-border p-6 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">No relevant knowledge found</p>
          <p className="text-xs text-muted-foreground">Try a different description or upload more files to your knowledge base.</p>
        </div>
      )}

      {/* Results */}
      {result && (result.compiledContext || result.metadata?.sources?.length > 0) && !loading && (
        <div className="space-y-4">
          {/* Metadata summary */}
          {result.metadata && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                <span>{result.metadata.fragmentCount} fragments</span>
                <span>·</span>
                <span>{result.metadata.totalTokens} / {result.metadata.tokenBudget} tokens</span>
                <span>·</span>
                <span>{result.metadata.compilationTimeMs}ms</span>
                <span>·</span>
                <span className={
                  result.metadata.coverage === "full" ? "text-green-600 dark:text-green-400" :
                  result.metadata.coverage === "partial" ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400"
                }>
                  Coverage: {result.metadata.coverage}
                </span>
              </div>

              {/* Source list */}
              {result.metadata.sources.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-medium mb-2">Sources ({result.metadata.sources.length} files)</h3>
                  {result.metadata.sources.map((source) => (
                    <div key={source.fileId} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/50 transition">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{source.fileName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                        {source.relevanceScore.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compiled context */}
          {result.compiledContext && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Compiled Context</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyContext}
                  className="h-8"
                >
                  {copied ? (
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
                  {result.compiledContext}
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
