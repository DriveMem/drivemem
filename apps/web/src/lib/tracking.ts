export function trackEvent(event: string, properties?: Record<string, unknown>) {
  // Fire-and-forget POST to /api/events
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties, timestamp: new Date().toISOString() }),
  }).catch(() => {}) // silent fail
}
