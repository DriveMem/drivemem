import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, sql } from 'drizzle-orm';

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

  // Search feedback boost (click/thumbs_up/thumbs_down)
  const searchFeedbackCounts = await db.select({
    fileId: schema.searchFeedback.fileId,
    ups: sql<number>`count(*) filter (where ${schema.searchFeedback.signal} = 'thumbs_up' or ${schema.searchFeedback.signal} = 'click')`,
    downs: sql<number>`count(*) filter (where ${schema.searchFeedback.signal} = 'thumbs_down')`,
  }).from(schema.searchFeedback)
    .where(and(
      eq(schema.searchFeedback.userId, userId),
      inArray(schema.searchFeedback.fileId, fileIds)
    ))
    .groupBy(schema.searchFeedback.fileId);

  const boostMap = new Map(searchFeedbackCounts.map(f => [f.fileId, (Number(f.ups) - Number(f.downs) * 2) * 0.05]));

  return results.map(r => {
    const rating = feedbackMap[r.fileId];
    let multiplier = 1.0;
    if (rating === 'useful') multiplier = 1.2;
    else if (rating === 'not_useful') multiplier = 0.3;

    const boost = boostMap.get(r.fileId) || 0;
    return { ...r, score: r.score * multiplier + boost };
  }).sort((a, b) => b.score - a.score);
}
