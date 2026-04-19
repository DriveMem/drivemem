import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Quick Start — DriveMem Developer Docs",
  description:
    "Get started with DriveMem in 5 minutes. Integrate via REST API or MCP Protocol to give your AI persistent memory.",
  openGraph: {
    title: "Quick Start — DriveMem Developer Docs",
    description:
      "Get started with DriveMem in 5 minutes. REST API & MCP Protocol integration guide.",
    type: "website",
    url: "https://drivemem.cloud/docs/quickstart",
    siteName: "DriveMem",
    images: [
      {
        url: "https://drivemem.cloud/og-image.png",
        width: 1200,
        height: 630,
        alt: "DriveMem Developer Quick Start",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quick Start — DriveMem Developer Docs",
    description:
      "Get started with DriveMem in 5 minutes. REST API & MCP Protocol integration guide.",
    images: ["https://drivemem.cloud/og-image.png"],
  },
}

export default function DocsQuickstartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
