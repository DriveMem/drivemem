import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export async function applyFeedbackWeights<T extends { fileId: string; score: number }>(
  userId: string,
  results: T[]
): Promise<T[]> {
  if (results.length === 0) return results;

  const fileIds = [...new Set(results.map(r => r.fileId))];

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

  return results.map(r => {
    const rating = feedbackMap[r.fileId];
    let multiplier = 1.0;
    if (rating === 'useful') multiplier = 1.2;
    else if (rating === 'not_useful') multiplier = 0.3;

    return { ...r, score: r.score * multiplier };
  }).sort((a, b) => b.score - a.score);
}
