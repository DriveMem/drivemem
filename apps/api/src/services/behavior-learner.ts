import { db } from '../db/index.js';
import { apiActivityLogs } from '../db/schema.js';
import { eq, and, gte, inArray } from 'drizzle-orm';

// --- Cache: per apiKeyId or userId, 1-hour TTL ---
const CACHE_TTL_MS = 60 * 60 * 1000;
const boostCache = new Map<string, { boosts: Record<string, number>; ts: number }>();

function pruneBoostCache(): void {
  const now = Date.now();
  for (const [key, entry] of boostCache) {
    if (now - entry.ts > CACHE_TTL_MS) {
      boostCache.delete(key);
    }
  }
}

// Keyword groups mapped to boost categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  engineering: ['code', 'implement', 'build', 'debug', 'fix', 'refactor', 'deploy', 'compile', 'function', 'class', 'module', 'api', 'endpoint', 'migration', 'schema'],
  preference: ['write', 'draft', 'content', 'blog', 'article', 'copy', 'edit', 'tone', 'style', 'narrative', 'story', 'document'],
  analysis: ['analyze', 'research', 'compare', 'evaluate', 'assess', 'investigate', 'study', 'review', 'data', 'metrics', 'benchmark', 'insight'],
  decision: ['plan', 'strategy', 'decide', 'prioritize', 'roadmap', 'milestone', 'goal', 'objective', 'tradeoff', 'scope', 'architecture'],
};

const ANALYZED_ACTIONS = ['search', 'ask', 'compile_context', 'store'];

/**
 * Get dynamic behavior-based boosts for an agent.
 * Analyzes the last 7 days of activity logs to determine usage patterns,
 * then returns category multipliers (e.g. { engineering: 1.2, analysis: 0.9 }).
 */
export async function getBehaviorBoosts(
  userId: string,
  apiKeyId?: string,
): Promise<Record<string, number>> {
  pruneBoostCache();

  const cacheKey = apiKeyId ? `key:${apiKeyId}` : `user:${userId}`;
  const cached = boostCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.boosts;
  }

  const boosts = await computeBehaviorBoosts(userId, apiKeyId);
  boostCache.set(cacheKey, { boosts, ts: Date.now() });
  return boosts;
}

async function computeBehaviorBoosts(
  userId: string,
  apiKeyId?: string,
): Promise<Record<string, number>> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Build query conditions
    const conditions = [
      eq(apiActivityLogs.userId, userId),
      gte(apiActivityLogs.createdAt, sevenDaysAgo),
      inArray(apiActivityLogs.action, ANALYZED_ACTIONS),
    ];
    if (apiKeyId) {
      conditions.push(eq(apiActivityLogs.apiKeyId, apiKeyId));
    }

    const logs = await db
      .select({ detail: apiActivityLogs.detail, action: apiActivityLogs.action })
      .from(apiActivityLogs)
      .where(and(...conditions))
      .limit(500);

    if (logs.length < 5) {
      // Not enough data — return neutral boosts
      return {};
    }

    // Count category hits per log entry
    const categoryCounts: Record<string, number> = {};
    let totalEntries = 0;

    for (const log of logs) {
      const text = (log.detail || '').toLowerCase();
      if (!text) continue;
      totalEntries++;

      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      }
    }

    if (totalEntries === 0) return {};

    // Convert counts to boost multipliers
    const boosts: Record<string, number> = {};
    for (const category of Object.keys(CATEGORY_KEYWORDS)) {
      const ratio = (categoryCounts[category] || 0) / totalEntries;
      // 70%+ → strong boost (1.3), 40-70% → moderate boost (1.15), 20-40% → slight (1.05), <20% → slight decrease (0.95)
      if (ratio >= 0.7) {
        boosts[category] = 1.3;
      } else if (ratio >= 0.4) {
        boosts[category] = 1.15;
      } else if (ratio >= 0.2) {
        boosts[category] = 1.05;
      } else if (ratio < 0.1 && totalEntries >= 10) {
        // Only penalize if we have enough data and category is rarely used
        boosts[category] = 0.95;
      }
      // Otherwise omit (neutral = 1.0)
    }

    return boosts;
  } catch (e) {
    console.error('[behavior-learner] Failed to compute boosts:', e);
    return {};
  }
}
