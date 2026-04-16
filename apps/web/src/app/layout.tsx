import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { UploadProgress } from '@/components/upload-progress'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const instrumentSerif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-instrument-serif', style: ['normal', 'italic'] })

export const metadata: Metadata = {
  title: "DriveMem — Memory for your AI agents",
  description: "DriveMem gives every AI agent the context it needs. One knowledge base, seamless continuity.",
  keywords: ["agent context", "AI context OS", "knowledge base", "MCP", "context compiler", "DriveMem", "RAG"],
  openGraph: {
    title: "DriveMem — Memory for your AI agents",
    description: "DriveMem gives every AI agent the context it needs. One knowledge base, seamless continuity.",
    type: "website",
    url: "https://drivemem.com",
    siteName: "DriveMem",
    images: [{ url: "https://drivemem.com/og-image.png", width: 1200, height: 630, alt: "DriveMem — Memory for your AI agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DriveMem — Memory for your AI agents",
    description: "DriveMem gives every AI agent the context it needs. One knowledge base, seamless continuity.",
    images: ["https://drivemem.com/og-image.png"],
  },
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} ${instrumentSerif.variable} font-sans antialiased`} suppressHydrationWarning>
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
