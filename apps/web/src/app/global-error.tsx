"use client"

const RELOAD_KEY = "__dm_reload_count"
const RELOAD_TS_KEY = "__dm_reload_ts"
const MAX_RELOADS = 2
const RESET_INTERVAL = 5 * 60 * 1000

function isStaleChunkError(error: Error): boolean {
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

export default function GlobalError({ error }: { error: Error; reset: () => void }) {
  // Auto-reload for stale chunks
  if (typeof window !== "undefined" && isStaleChunkError(error)) {
    const count = getReloadCount()
    if (count < MAX_RELOADS) {
      incrementReloadCount()
      window.location.reload()
      return null
    }
  }

  async function clearCachesAndReload() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {
      // ignore
    }
    window.location.reload()
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#fff", color: "#111" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px" }}>🔄</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>A new version is available</h1>
          <p style={{ fontSize: "14px", color: "#666", maxWidth: "400px", margin: 0 }}>
            Please clear your browser cache and refresh to get the latest version of DriveMem.
          </p>
          <button
            onClick={clearCachesAndReload}
            style={{ padding: "10px 24px", fontSize: "14px", fontWeight: 600, background: "#111", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >
            Clear cache and retry
          </button>
        </div>
      </body>
    </html>
  )
}
