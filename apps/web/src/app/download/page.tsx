"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Platform = "mac" | "win" | "linux"

const FALLBACK_VERSION = "0.1.0"
const FALLBACK_BASE = "https://github.com/yufuche1/ai-drive/releases/latest/download"

interface DownloadInfo {
  version: string
  urls: Record<Platform, string>
  files: Record<Platform, string>
}

function makeFallback(): DownloadInfo {
  return {
    version: FALLBACK_VERSION,
    urls: {
      mac: `${FALLBACK_BASE}/DriveMem-${FALLBACK_VERSION}.dmg`,
      win: `${FALLBACK_BASE}/DriveMem-Setup-${FALLBACK_VERSION}.exe`,
      linux: `${FALLBACK_BASE}/DriveMem-${FALLBACK_VERSION}.AppImage`,
    },
    files: {
      mac: `DriveMem-${FALLBACK_VERSION}.dmg`,
      win: `DriveMem-Setup-${FALLBACK_VERSION}.exe`,
      linux: `DriveMem-${FALLBACK_VERSION}.AppImage`,
    },
  }
}

async function fetchLatestRelease(): Promise<DownloadInfo> {
  const res = await fetch("/api/desktop/latest-version")
  if (!res.ok) throw new Error(`Backend API ${res.status}`)
  const data = await res.json()
  const version: string | null = data.version
  if (!version) throw new Error("No version available")

  const base = FALLBACK_BASE
  return {
    version,
    urls: {
      mac: `${base}/DriveMem-${version}.dmg`,
      win: `${base}/DriveMem-Setup-${version}.exe`,
      linux: `${base}/DriveMem-${version}.AppImage`,
    },
    files: {
      mac: `DriveMem-${version}.dmg`,
      win: `DriveMem-Setup-${version}.exe`,
      linux: `DriveMem-${version}.AppImage`,
    },
  }
}

const PLATFORMS: Record<Platform, { label: string; icon: React.ReactNode; req: string }> = {
  mac: {
    label: "macOS",
    req: "macOS 10.15+",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
    ),
  },
  win: {
    label: "Windows",
    req: "Windows 10+",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
    ),
  },
  linux: {
    label: "Linux",
    req: "Ubuntu 20.04+ / Fedora 36+",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.811.504 1.569 1.156 2.08 0 0-.272.543-.396 1.202-.122.651-.09 1.404.378 1.989.308.385.743.593 1.2.693.457.101.928.098 1.35.01.849-.174 1.483-.59 1.8-1.156.156.006.313.01.47.01.157 0 .313-.004.47-.01.316.565.95.982 1.8 1.156.421.089.892.091 1.35-.01.456-.1.891-.308 1.2-.693.467-.585.5-1.338.377-1.989-.124-.659-.396-1.202-.396-1.202.652-.511 1.039-1.269 1.156-2.08.124-.805-.009-1.657-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298A4.028 4.028 0 0012.504 0z"/></svg>
    ),
  },
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

function detectOS(): Platform | null {
  if (typeof navigator === "undefined") return null
  const ua = navigator.userAgent.toLowerCase()
  // Mobile devices — don't recommend desktop downloads
  if (/iphone|ipad|ipod|android/.test(ua)) return null
  if (ua.includes("mac")) return "mac"
  if (ua.includes("win")) return "win"
  if (ua.includes("linux")) return "linux"
  return null
}

export default function DownloadPage() {
  const [detected, setDetected] = useState<Platform | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [info, setInfo] = useState<DownloadInfo>(makeFallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setDetected(detectOS())
    setIsMobile(isMobileDevice())
    fetchLatestRelease()
      .then(setInfo)
      .catch(() => {/* keep fallback */})
      .finally(() => setLoading(false))
  }, [])

  const allPlatforms: Platform[] = ["mac", "win", "linux"]
  const order: Platform[] = detected
    ? [detected, ...allPlatforms.filter(p => p !== detected)]
    : allPlatforms

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 selection:bg-brand-100">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-zinc-700/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-mono text-xs font-bold">D</span>
            </div>
            <span className="text-gray-900 dark:text-zinc-100 font-semibold tracking-tight">DriveMem</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors">
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="pt-32 pb-16 md:pt-40 md:pb-24 dark:bg-zinc-900"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #F0F2FF 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 mb-4">
            Download DriveMem
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 text-lg mb-2">
            Desktop app for macOS, Windows, and Linux
          </p>
          <p className="text-sm text-gray-400 dark:text-zinc-500">
            {loading ? "Loading version…" : `Version v${info.version}`}
          </p>
        </div>
      </section>

      {/* Download Cards */}
      <section className="py-16 md:py-24 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-6">
          {isMobile && (
            <div className="mb-8 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-6 py-5 text-center">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                DriveMem Desktop is available for macOS, Windows, and Linux. Visit this page on your computer to download.
              </p>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-6">
            {order.map((platform) => {
              const p = PLATFORMS[platform]
              const isPrimary = detected !== null && platform === detected
              return (
                <div
                  key={platform}
                  className={`relative rounded-2xl border p-8 text-center transition-all duration-300 hover:-translate-y-1 ${
                    isPrimary
                      ? "border-brand-500 shadow-brand-md bg-brand-50/30 dark:bg-brand-950/20"
                      : "border-gray-100 dark:border-zinc-700 shadow-soft hover:shadow-soft-md dark:bg-zinc-800"
                  }`}
                >
                  {isPrimary && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-white bg-brand-500 px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 ${
                    isPrimary ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300"
                  }`}>
                    {p.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-1">{p.label}</h3>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mb-6">{p.req}</p>
                  <a
                    href={info.urls[platform]}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isPrimary
                        ? "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-sm"
                        : "border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download .{info.files[platform].split('.').pop()}
                  </a>
                  <p className="mt-3 text-xs text-gray-400 dark:text-zinc-500">{info.files[platform]}</p>
                </div>
              )
            })}
          </div>

          {/* macOS installation note */}
          {detected === "mac" && (
            <details className="mt-8 rounded-xl border border-gray-100 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 px-6 py-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-zinc-300 select-none">
                macOS: First launch instructions
              </summary>
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
                <p>Since the app isn&apos;t code-signed yet, macOS may block it on first launch.</p>
                <p className="font-medium text-zinc-600 dark:text-zinc-300">To open:</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Download and open the <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px]">.dmg</code></li>
                  <li>Drag DriveMem to Applications</li>
                  <li>Right-click the app → <strong>Open</strong> (not double-click)</li>
                  <li>Click &quot;Open&quot; in the security dialog</li>
                </ol>
                <p>Or run in Terminal:</p>
                <code className="block px-3 py-2 rounded bg-gray-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px]">
                  xattr -d com.apple.quarantine /Applications/DriveMem.app
                </code>
              </div>
            </details>
          )}

          {/* Additional info */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-400 dark:text-zinc-500 mb-4">
              All downloads are from{" "}
              <a href="https://github.com/yufuche1/ai-drive/releases" target="_blank" rel="noopener" className="text-brand-500 hover:text-brand-600 transition-colors">
                GitHub Releases
              </a>
            </p>
            <Link
              href="/signup"
              className="inline-flex px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-brand-sm"
            >
              Or use the web app →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-zinc-700 py-8 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-zinc-500">
          <span>© {new Date().getFullYear()} DriveMem</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
