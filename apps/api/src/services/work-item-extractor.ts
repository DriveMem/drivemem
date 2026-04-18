/**
 * Work Item Extractor — auto-extract decisions/TODOs/blockers/milestones from content.
 * Fire-and-forget: errors are swallowed silently.
 */

import { chat } from './llm.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';

const EXTRACT_SYSTEM = `Extract actionable work items from this text. For each, identify:
- type: one of "decision", "todo", "blocker", "milestone", "insight"
- title: max 80 chars, concise
- priority: "high", "medium", or "low"

Return a JSON array. If nothing actionable, return [].
Example: [{"type":"todo","title":"Set up CI/CD pipeline","priority":"high"}]
Return ONLY the JSON array, no markdown fences.`;

interface ExtractedItem {
  type: string;
  title: string;
  priority?: string;
}

function levenshteinSimilarity(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (Math.max(m, n) === 0) return 1;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

const VALID_TYPES = new Set(['decision', 'todo', 'blocker', 'milestone', 'insight']);
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

/**
 * Extract work items from content and store them. Fire-and-forget.
 */
export async function extractWorkItems(
  userId: string,
  content: string,
  sourceFileId?: string,
  sourceAgent?: string,
  folderId?: string,
): Promise<void> {
  try {
    if (!content || content.length < 20) return;

    const truncated = content.slice(0, 3000);
    const response = await chat([
      { role: 'system', content: EXTRACT_SYSTEM },
      { role: 'user', content: truncated },
    ]);

    let items: ExtractedItem[];
    try {
      // Strip markdown fences if present
      const cleaned = response.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      items = JSON.parse(cleaned);
    } catch {
      return; // LLM returned non-JSON, skip
    }

    if (!Array.isArray(items) || items.length === 0) return;

    // Get recent work items for dedup
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existing = await db.select({ title: schema.workItems.title })
      .from(schema.workItems)
      .where(and(
        eq(schema.workItems.userId, userId),
        gte(schema.workItems.createdAt, sevenDaysAgo),
      ));
    const existingTitles = existing.map(e => e.title.toLowerCase());

    for (const item of items.slice(0, 10)) {
      if (!item.title || !item.type) continue;
      if (!VALID_TYPES.has(item.type)) continue;

      const title = item.title.slice(0, 255);
      const priority = VALID_PRIORITIES.has(item.priority || '') ? item.priority! : null;

      // Dedup: skip if similar title exists
      const isDuplicate = existingTitles.some(
        et => levenshteinSimilarity(et, title.toLowerCase()) > 0.85
      );
      if (isDuplicate) continue;

      await db.insert(schema.workItems).values({
        userId,
        folderId: folderId || null,
        type: item.type,
        title,
        priority,
        sourceFileId: sourceFileId || null,
        sourceAgent: sourceAgent || null,
      });

      existingTitles.push(title.toLowerCase());
    }
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error('[work-item-extractor] Error:', (err as Error).message);
  }
}
