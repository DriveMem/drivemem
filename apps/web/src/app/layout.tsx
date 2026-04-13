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
  title: "DriveMem - One memory. Every agent.",
  description: "The shared memory layer for all your AI agents. Store knowledge once, use it everywhere.",
  keywords: ["agent memory", "AI context", "knowledge base", "MCP", "agent memory layer", "DriveMem", "Agent Context OS", "RAG"],
  openGraph: {
    title: "DriveMem - One memory. Every agent.",
    description: "The shared memory layer for all your AI agents. Store knowledge once, use it everywhere.",
    type: "website",
    url: "https://drivemem.cloud",
    siteName: "DriveMem",
    images: [{ url: "https://drivemem.cloud/og-image.png", width: 1200, height: 630, alt: "DriveMem - One memory. Every agent." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DriveMem - One memory. Every agent.",
    description: "The shared memory layer for all your AI agents. Store knowledge once, use it everywhere.",
    images: ["https://drivemem.cloud/og-image.png"],
  },
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
