import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "DriveMem 开发者",
  description: "通过 REST API 和 MCP 协议将 DriveMem 接入你的工作流 — 语义搜索、知识存储、AI 洞察",
  openGraph: {
    title: "DriveMem 开发者",
    description: "通过 API 和 MCP 将 DriveMem 接入你的工作流",
    type: "website",
    url: "https://drivemem.cloud/developers",
  },
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
