"use client"

const RELOAD_KEY = "chunk-reload-count"
const RELOAD_TS_KEY = "chunk-reload-ts"
const MAX_RELOADS = 2
const RESET_INTERVAL = 5 * 60 * 1000

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message || ""
  const name = error?.name || ""
  return (
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    (name === "ReferenceError" && msg.includes("before initialization")) ||
    (name === "TypeError" && (
      msg.includes("is not a function") ||
      msg.includes("Cannot read properties of undefined") ||
      msg.includes("is not a constructor") ||
      msg.includes("Failed to fetch")
    ))
  )
}

function getReloadCount(): number {
  try {
    const ts = Number(sessionStorage.getItem(RELOAD_TS_KEY) || "0")
    if (Date.now() - ts > RESET_INTERVAL) {
      sessionStorage.removeItem(RELOAD_KEY)
      sessionStorage.removeItem(RELOAD_TS_KEY)
      return 0
    }
    return Number(sessionStorage.getItem(RELOAD_KEY) || "0")
  } catch {
    return 0
  }
}

function incrementReloadCount(): void {
  try {
    const count = getReloadCount()
    sessionStorage.setItem(RELOAD_KEY, String(count + 1))
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

async function clearCacheAndReload() {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !key.startsWith("auth") && !key.startsWith("supabase")) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
    sessionStorage.clear()
    if ("caches" in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // ignore
  }
  window.location.reload()
}

export default function GlobalError({ error }: { error: Error; reset: () => void }) {
  // Auto-reload for chunk errors
  if (typeof window !== "undefined" && isChunkLoadError(error)) {
    const count = getReloadCount()
    if (count < MAX_RELOADS) {
      incrementReloadCount()
      window.location.reload()
      return null
    }
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#fff", color: "#111" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px" }}>⚠️</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: "14px", color: "#666", maxWidth: "400px", margin: 0 }}>
            The page encountered an error while loading. Please try one of the options below.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 24px", fontSize: "14px", fontWeight: 600, background: "#111", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
            >
              🔄 Refresh Page
            </button>
            <button
              onClick={clearCacheAndReload}
              style={{ padding: "10px 24px", fontSize: "14px", fontWeight: 600, background: "#fff", color: "#111", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
            >
              🗑️ Clear Cache &amp; Refresh
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "#999", margin: 0 }}>
            If the problem persists, please contact support.
          </p>
        </div>
      </body>
    </html>
  )
}
