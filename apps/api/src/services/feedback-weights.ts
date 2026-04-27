import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, sql, gt, isNotNull } from 'drizzle-orm';

// Signal weights for search feedback scoring
const SIGNAL_WEIGHTS: Record<string, number> = {
  click: 0.05,
  thumbs_up: 0.10,
  thumbs_down: -0.10,
  dwell: 0.03,
  copy: 0.08,
  reformulation: -0.05,
};

export async function applyFeedbackWeights<T extends { fileId: string; score: number }>(
  userId: string,
  results: T[]
): Promise<T[]> {
  if (results.length === 0) return results;

  const fileIds = [...new Set(results.map(r => r.fileId))];

  // Legacy knowledge feedback (useful/not_useful)
  const feedbacks = await db.select({
    fileId: schema.knowledgeFeedback.fileId,
    rating: schema.knowledgeFeedback.rating,
  })
    .from(schema.knowledgeFeedback)
    .where(and(
      eq(schema.knowledgeFeedback.userId, userId),
      inArray(schema.knowledgeFeedback.fileId, fileIds)
    ));

  const feedbackMap: Record<string, string> = {};
  feedbacks.forEach(f => { feedbackMap[f.fileId] = f.rating; });

  // Search feedback boost — weighted scoring per signal type
  const feedbackScores = await db.select({
    fileId: schema.searchFeedback.fileId,
    signal: schema.searchFeedback.signal,
    count: sql<number>`count(*)::int`,
  }).from(schema.searchFeedback)
    .where(and(
      eq(schema.searchFeedback.userId, userId),
      inArray(schema.searchFeedback.fileId, fileIds),
      isNotNull(schema.searchFeedback.fileId)
    ))
    .groupBy(schema.searchFeedback.fileId, schema.searchFeedback.signal);

  const boostMap = new Map<string, number>();
  for (const row of feedbackScores) {
    if (!row.fileId) continue;
    const current = boostMap.get(row.fileId) || 0;
    boostMap.set(row.fileId, current + (SIGNAL_WEIGHTS[row.signal] || 0) * row.count);
  }

  // Citation boost: files referenced more often rank higher (last 30 days)
  const citationCounts = await db.select({
    fileId: schema.citationEvents.fileId,
    count: sql<number>`count(*)::int`,
  }).from(schema.citationEvents)
    .where(and(
      eq(schema.citationEvents.userId, userId),
      inArray(schema.citationEvents.fileId, fileIds),
      gt(schema.citationEvents.createdAt, sql`now() - interval '30 days'`)
    ))
    .groupBy(schema.citationEvents.fileId);

  const maxCitations = Math.max(...citationCounts.map(c => c.count), 1);
  const citationMap = new Map(citationCounts.map(c => [c.fileId, (c.count / maxCitations) * 0.1]));

  return results.map(r => {
    const rating = feedbackMap[r.fileId];
    let multiplier = 1.0;
    if (rating === 'useful') multiplier = 1.2;
    else if (rating === 'not_useful') multiplier = 0.3;

    const boost = boostMap.get(r.fileId) || 0;
    const citationBoost = citationMap.get(r.fileId) || 0;
    return { ...r, score: r.score * multiplier + boost + citationBoost };
  }).sort((a, b) => b.score - a.score);
}
