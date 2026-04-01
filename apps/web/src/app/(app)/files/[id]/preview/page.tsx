"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { mockFiles } from "@/lib/mock-data"

function PdfPlaceholder() {
  return (
    <div className="flex h-96 items-center justify-center rounded border bg-muted text-muted-foreground">
      PDF 预览需要 react-pdf（暂未集成）
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown render — in production use react-markdown
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <pre className="whitespace-pre-wrap">{content}</pre>
    </div>
  )
}

function TxtPreview({ content }: { content: string }) {
  return <pre className="whitespace-pre-wrap rounded border bg-muted p-4 text-sm">{content}</pre>
}

const MOCK_CONTENT: Record<string, string> = {
  "2": "# 技术方案\n\n## 背景\nAI Drive 是一个基于 RAG 的文件管理与对话产品。\n\n## 架构\n- Next.js 前端\n- Hono 后端\n- PostgreSQL + pgvector",
  "3": "2026 年第 13 周周报\n\n完成：\n- 文件上传功能\n- AI 对话基础框架\n\n计划：\n- 文件预览\n- 搜索功能",
  "4": "# LLM 论文笔记\n\n## Attention Is All You Need\n- Transformer 架构\n- Self-attention 机制\n\n## RAG\n- Retrieval-Augmented Generation\n- 结合检索与生成",
}

export default function FilePreviewPage() {
  const params = useParams<{ id: string }>()
  const file = mockFiles.find((f) => f.id === params.id)

  if (!file) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        文件不存在
      </div>
    )
  }

  const content = MOCK_CONTENT[file.id] || `${file.name} 的内容预览（mock）`

  return (
    <div className="flex gap-6 p-6">
      {/* Main preview */}
      <div className="flex-1">
        <h1 className="mb-4 text-xl font-bold">{file.name}</h1>
        {file.type === "pdf" && <PdfPlaceholder />}
        {file.type === "md" && <MarkdownPreview content={content} />}
        {file.type === "txt" && <TxtPreview content={content} />}
        {file.type === "image" && (
          <div className="flex h-96 items-center justify-center rounded border bg-muted text-muted-foreground">
            图片预览（mock）
          </div>
        )}
      </div>

      {/* Inspector sidebar */}
      <Card className="w-72 shrink-0">
        <CardContent className="space-y-4 p-4">
          <h2 className="font-semibold">文件信息</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">类型</dt>
              <dd>{file.type.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">大小</dt>
              <dd>{(file.size / 1024).toFixed(0)} KB</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">状态</dt>
              <dd>{file.parseStatus}</dd>
            </div>
          </dl>
          <Button className="w-full" asChild>
            <a href={`/chat?file=${file.id}`}>对此文件提问</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
