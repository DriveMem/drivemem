import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Drive 开发者",
  description: "通过 REST API 和 MCP 协议将 AI Drive 接入你的工作流 — 语义搜索、知识存储、AI 洞察",
  openGraph: {
    title: "AI Drive 开发者",
    description: "通过 API 和 MCP 将 AI Drive 接入你的工作流",
    type: "website",
    url: "https://drive.verrrnm.cloud/developers",
  },
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
