"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Platform = "mac" | "win" | "linux"

const VERSION = "0.1.0"
const BASE = "https://github.com/yufuche1/ai-drive/releases/latest/download"

const PLATFORMS: Record<Platform, { label: string; file: string; icon: React.ReactNode; req: string }> = {
  mac: {
    label: "macOS",
    file: `DriveMem-${VERSION}.dmg`,
    req: "macOS 10.15+",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
    ),
  },
  win: {
    label: "Windows",
    file: `DriveMem-Setup-${VERSION}.exe`,
    req: "Windows 10+",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
    ),
  },
  linux: {
    label: "Linux",
    file: `DriveMem-${VERSION}.AppImage`,
    req: "Ubuntu 20.04+ / Fedora 36+",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.43.868.07 1.723-.26 2.456-.594.733-.34 1.455-.678 2.186-.78.731-.1 1.506-.071 2.099-.27.59-.198.977-.735 1.048-1.23.029-.227.002-.443-.048-.618-.05-.174-.134-.3-.218-.427l-.002-.004c-.178-.272-.398-.544-.524-.838-.087-.193-.126-.453-.11-.714.016-.259.084-.527.168-.79.082-.263.178-.513.214-.748.01-.053.015-.107.012-.16-.056-.485-.484-.897-.953-1.085a2.4 2.4 0 00-.505-.134 2.065 2.065 0 00-.655.012c-.288.058-.55.192-.852.312-.301.12-.632.242-.974.181a.994.994 0 01-.282-.101 2.14 2.14 0 01-.267-.178c-.287-.223-.495-.527-.762-.872a4.17 4.17 0 00-1.02-1.05c-.332-.24-.723-.398-1.116-.458a4.137 4.137 0 00-1.148.018L12.9 9.95c-.527-.108-1.09-.136-1.608-.09-.247-.657-.655-1.203-1.167-1.49a2.066 2.066 0 00-.527-.204 2.926 2.926 0 00.195-1.148c.004-.357-.058-.71-.156-1.04-.098-.33-.233-.64-.372-.898-.07-.13-.149-.263-.21-.37a4.99 4.99 0 01-.159-.312c-.154-.34-.266-.722-.255-1.194.012-.53.158-1.166.608-1.878C9.895 1.186 11.028.5 12.504 0z"/></svg>
    ),
  },
}

function detectOS(): Platform {
  if (typeof navigator === "undefined") return "win"
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("mac")) return "mac"
  if (ua.includes("linux")) return "linux"
  return "win"
}

export default function DownloadPage() {
  const [detected, setDetected] = useState<Platform>("win")
  useEffect(() => { setDetected(detectOS()) }, [])

  const order: Platform[] = [detected, ...( ["mac", "win", "linux"] as Platform[]).filter(p => p !== detected)]

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-brand-100">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-mono text-xs font-bold">D</span>
            </div>
            <span className="text-gray-900 font-semibold tracking-tight">DriveMem</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="pt-32 pb-16 md:pt-40 md:pb-24"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #F0F2FF 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Download DriveMem
          </h1>
          <p className="text-gray-500 text-lg mb-2">
            Desktop app for macOS, Windows, and Linux
          </p>
          <p className="text-sm text-gray-400">
            Version v{VERSION}
          </p>
        </div>
      </section>

      {/* Download Cards */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {order.map((platform) => {
              const p = PLATFORMS[platform]
              const isPrimary = platform === detected
              return (
                <div
                  key={platform}
                  className={`relative rounded-2xl border p-8 text-center transition-all duration-300 hover:-translate-y-1 ${
                    isPrimary
                      ? "border-brand-500 shadow-brand-md bg-brand-50/30"
                      : "border-gray-100 shadow-soft hover:shadow-soft-md"
                  }`}
                >
                  {isPrimary && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-white bg-brand-500 px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 ${
                    isPrimary ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {p.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{p.label}</h3>
                  <p className="text-xs text-gray-400 mb-6">{p.req}</p>
                  <a
                    href={`${BASE}/${p.file}`}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isPrimary
                        ? "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-sm"
                        : "border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download .{p.file.split('.').pop()}
                  </a>
                  <p className="mt-3 text-xs text-gray-400">{p.file}</p>
                </div>
              )
            })}
          </div>

          {/* Additional info */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-400 mb-4">
              All downloads are from{" "}
              <a href="https://github.com/yufuche1/ai-drive/releases" target="_blank" rel="noopener" className="text-brand-500 hover:text-brand-600 transition-colors">
                GitHub Releases
              </a>
            </p>
            <Link
              href="/login"
              className="inline-flex px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-sm"
            >
              Or use the web app →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} DriveMem</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
