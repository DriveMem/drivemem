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
  title: "AI Drive — One memory. Every agent.",
  description: "Your AI agents' shared memory layer. Upload docs, AI auto-indexes — then any agent can search, recall, and build on your knowledge via API, MCP, or CLI.",
  keywords: ["AI Drive", "Agent Context OS", "AI memory", "knowledge management", "RAG", "MCP", "agent memory", "context packet"],
  openGraph: {
    title: "AI Drive — One memory. Every agent.",
    description: "Your AI agents' shared memory layer. Upload once, every agent remembers.",
    type: "website",
    url: "https://drivemem.cloud",
    siteName: "AI Drive",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Drive — One memory. Every agent.",
    description: "Your AI agents' shared memory layer. Upload once, every agent remembers.",
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
