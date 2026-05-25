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
  metadataBase: new URL('https://drivemem.cloud'),
  title: "DriveMem — Memory for your AI agents",
  description: "DriveMem gives every AI agent the context it needs. One knowledge base, seamless continuity.",
  keywords: ["DriveMem", "AI agent memory", "agent context", "knowledge base", "MCP server", "RAG", "multi-agent collaboration"],
  openGraph: {
    title: "DriveMem — Memory for your AI agents",
    description: "DriveMem gives every AI agent the context it needs. One knowledge base, seamless continuity.",
    type: "website",
    url: "https://drivemem.cloud",
    siteName: "DriveMem",
    images: [{ url: "https://drivemem.cloud/og-image.png", width: 1200, height: 630, alt: "DriveMem — Memory for your AI agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DriveMem — Memory for your AI agents",
    description: "DriveMem gives every AI agent the context it needs. One knowledge base, seamless continuity.",
    images: ["https://drivemem.cloud/og-image.png"],
  },
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script defer data-domain="drivemem.cloud" src="https://plausible.io/js/script.js"></script>
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var K="chunk-reload-count",T="chunk-reload-ts",M=2,R=3e5;
  function c(e){var m=e&&e.message||"",n=e&&e.name||"";
    return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/.test(m)||
      (n==="ReferenceError"&&/before initialization/.test(m))||
      (n==="TypeError"&&/is not a function|Cannot read properties of undefined|Failed to fetch/.test(m))}
  function g(){try{var t=+sessionStorage.getItem(T);if(Date.now()-t>R){sessionStorage.removeItem(K);sessionStorage.removeItem(T);return 0}return +(sessionStorage.getItem(K)||0)}catch(e){return 0}}
  function s(){try{var n=g();sessionStorage.setItem(K,""+(n+1));sessionStorage.setItem(T,""+Date.now())}catch(e){}}
  function h(e){if(c(e)){var n=g();if(n<M){s();location.reload()}}}
  window.addEventListener("error",function(ev){h(ev.error)});
  window.addEventListener("unhandledrejection",function(ev){h(ev.reason)});
})();
        `.trim() }} />
      </head>
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
