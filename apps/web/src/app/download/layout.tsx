import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Download — DriveMem",
  openGraph: {
    title: "Download DriveMem Desktop",
    description:
      "Download DriveMem for macOS, Windows, and Linux. Your AI agents' memory, on your desktop.",
    type: "website",
    url: "https://drivemem.cloud/download",
    siteName: "DriveMem",
    images: [
      {
        url: "https://drivemem.cloud/og-image.png",
        width: 1200,
        height: 630,
        alt: "Download DriveMem Desktop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Download DriveMem Desktop",
    description:
      "Download DriveMem for macOS, Windows, and Linux. Your AI agents' memory, on your desktop.",
    images: ["https://drivemem.cloud/og-image.png"],
  },
}

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
