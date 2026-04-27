import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { sql, desc } from 'drizzle-orm';

export async function aggregateQueryPatterns(): Promise<{ patterns: number }> {
  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.anonymousSearchSignals);
  if ((countRow?.count || 0) < 100) {
    console.log('[query-patterns] Not enough data yet, skipping');
    return { patterns: 0 };
  }

  const aggregates = await db.select({
    queryHash: schema.anonymousSearchSignals.queryHash,
    category: sql<string>`mode() within group (order by query_category)`,
    frequency: sql<number>`count(*)::int`,
    avgResultCount: sql<number>`avg(result_count)::real`,
    avgClickRate: sql<number>`avg(case when had_click then 1.0 else 0.0 end)::real`,
    lastSeen: sql<string>`max(created_at)::text`,
  }).from(schema.anonymousSearchSignals)
    .where(sql`created_at > now() - interval '30 days'`)
    .groupBy(schema.anonymousSearchSignals.queryHash)
    .having(sql`count(*) >= 3`)
    .orderBy(desc(sql`count(*)`))
    .limit(100);

  let updated = 0;
  for (const agg of aggregates) {
    const pattern = agg.category + ':' + agg.queryHash.slice(0, 8);
    await db.insert(schema.popularQueryPatterns).values({
      pattern,
      frequency: agg.frequency,
      avgResultCount: agg.avgResultCount,
      avgClickRate: agg.avgClickRate,
      lastSeen: agg.lastSeen ? new Date(agg.lastSeen) : new Date(),
    }).onConflictDoUpdate({
      target: schema.popularQueryPatterns.pattern,
      set: {
        frequency: agg.frequency,
        avgResultCount: agg.avgResultCount,
        avgClickRate: agg.avgClickRate,
        lastSeen: agg.lastSeen ? new Date(agg.lastSeen) : new Date(),
        updatedAt: new Date(),
      },
    });
    updated++;
  }

  console.log(`[query-patterns] Aggregated ${updated} patterns from ${countRow?.count} signals`);
  return { patterns: updated };
}
