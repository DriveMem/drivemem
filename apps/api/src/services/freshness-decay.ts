/**
 * Knowledge Freshness Decay — Agent Loop 3
 *
 * Applies a time-based decay factor to fragment scores based on
 * how recently a file was accessed (or updated as fallback).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns a multiplier (0.5–1.0) based on how recently the file was accessed.
 *
 * Rules:
 *   ≤7 days  → 1.0  (no decay)
 *   8–30 days → 0.9
 *   31–90 days → 0.7
 *   >90 days  → 0.5
 *
 * If lastAccessedAt is null, updatedAt is used as fallback.
 */
export function getFreshnessBoost(lastAccessedAt: Date | null, updatedAt: Date): number {
  const referenceDate = lastAccessedAt ?? updatedAt;
  const ageDays = (Date.now() - referenceDate.getTime()) / DAY_MS;

  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.9;
  if (ageDays <= 90) return 0.7;
  return 0.5;
}
