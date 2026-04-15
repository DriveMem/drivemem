import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { UploadProgress } from '@/components/upload-progress'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: "AI Drive — Agent Context OS",
  description: "AI Drive compiles the right context for every agent and every task. One knowledge base, seamless continuity.",
  keywords: ["agent context", "AI context OS", "knowledge base", "MCP", "context compiler", "AI Drive", "Agent Context OS", "RAG"],
  openGraph: {
    title: "AI Drive — Agent Context OS",
    description: "AI Drive compiles the right context for every agent and every task. One knowledge base, seamless continuity.",
    type: "website",
    url: "https://drivemem.cloud",
    siteName: "AI Drive",
    images: [{ url: "https://drivemem.cloud/og-image.png", width: 1200, height: 630, alt: "AI Drive — Agent Context OS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Drive — Agent Context OS",
    description: "AI Drive compiles the right context for every agent and every task. One knowledge base, seamless continuity.",
    images: ["https://drivemem.cloud/og-image.png"],
  },
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </AuthProvider>
          <Toaster />
          <UploadProgress />
        </ThemeProvider>
      </body>
    </html>
  )
}
