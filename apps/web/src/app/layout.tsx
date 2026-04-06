import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { NProgressProvider } from '@/providers/nprogress-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: "AI Drive - 让 AI 记住你的一切",
  description: "上传文件，AI 自动理解、记忆、分析。智能摘要、知识关联、跨文件对比、一键生成分析报告。你的个人 AI 知识分析平台。",
  keywords: ["AI Drive", "AI 网盘", "智能文档", "知识管理", "RAG", "文件分析"],
  openGraph: {
    title: "AI Drive - 让 AI 记住你的一切",
    description: "上传文件，AI 自动理解、记忆、分析。你的个人 AI 知识分析平台。",
    type: "website",
    url: "https://drive.verrrnm.cloud",
    siteName: "AI Drive",
  },
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <QueryProvider>
              <NProgressProvider>
                {children}
              </NProgressProvider>
            </QueryProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
