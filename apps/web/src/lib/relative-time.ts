/**
 * Unified relative-time formatter.
 * - < 1 min  → "just now"
 * - < 1 hour → "Xm ago"
 * - < 24 h   → "Xh ago"
 * - < 7 days → "Xd ago"
 * - ≥ 7 days → "Mon DD"
 */
export function relativeTime(dateStr: string, now?: Date): string {
  const ref = now ? now.getTime() : Date.now()
  const diff = ref - new Date(dateStr).getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
