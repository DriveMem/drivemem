/**
 * Stale Content Check Worker — runs daily to update staleScore for all files.
 */

import { db } from '../db/index.js';
import { files, knowledgeFeedback } from '../db/schema.js';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { computeStaleScore } from '../services/stale-detector.js';

export async function runStaleCheck(): Promise<{ checked: number; staleFound: number }> {
  // Get all distinct user IDs with indexed files
  const userRows = await db.selectDistinct({ userId: files.userId })
    .from(files)
    .where(and(isNull(files.archivedAt), isNull(files.deletedAt), eq(files.status, 'indexed')));

  let totalChecked = 0;
  let totalStale = 0;

  for (const { userId } of userRows) {
    // Get all files for this user
    const userFiles = await db.select({
      id: files.id,
      lastAccessedAt: files.lastAccessedAt,
      updatedAt: files.updatedAt,
      createdAt: files.createdAt,
      summary: files.summary,
    })
      .from(files)
      .where(and(
        eq(files.userId, userId),
        isNull(files.archivedAt),
        isNull(files.deletedAt),
        eq(files.status, 'indexed'),
      ));

    // Get negative feedback counts
    const feedbackRows = await db.select({
      fileId: knowledgeFeedback.fileId,
      negCount: sql<number>`count(*) filter (where ${knowledgeFeedback.rating} = 'not_useful')`,
    })
      .from(knowledgeFeedback)
      .where(eq(knowledgeFeedback.userId, userId))
      .groupBy(knowledgeFeedback.fileId);

    const negMap = new Map<string, number>();
    for (const row of feedbackRows) {
      negMap.set(row.fileId, Number(row.negCount));
    }

    // Update each file's staleScore
    for (const file of userFiles) {
      const score = computeStaleScore(
        file.lastAccessedAt,
        file.updatedAt,
        file.createdAt,
        file.summary,
        negMap.get(file.id) ?? 0,
      );

      await db.update(files)
        .set({ staleScore: score })
        .where(eq(files.id, file.id));

      totalChecked++;
      if (score > 0) totalStale++;
    }
  }

  console.log(`[stale-check] Checked ${totalChecked} files, found ${totalStale} stale`);
  return { checked: totalChecked, staleFound: totalStale };
}

// If run directly (e.g. via cron: node -e "import('./stale-check.js').then(m => m.runStaleCheck())")
if (process.argv[1]?.includes('stale-check')) {
  runStaleCheck()
    .then(r => { console.log(r); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
