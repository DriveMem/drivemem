import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { sql } from 'drizzle-orm';

export async function runModelProfileAggregation(): Promise<{ updated: number }> {
  const aggregates = await db.select({
    modelName: schema.proxyCallEvents.modelName,
    avgContextTokens: sql<number>`avg(context_tokens) filter (where success = true and context_tokens > 0)::int`,
    avgResponseMs: sql<number>`avg(response_time_ms) filter (where success = true)::int`,
    successRate: sql<number>`avg(case when success then 1.0 else 0.0 end)::real`,
    sampleCount: sql<number>`count(*)::int`,
  }).from(schema.proxyCallEvents)
    .where(sql`created_at > now() - interval '30 days'`)
    .groupBy(schema.proxyCallEvents.modelName);

  let updated = 0;
  for (const agg of aggregates) {
    if (agg.sampleCount < 10) continue;

    await db.insert(schema.modelProfileOverrides).values({
      modelName: agg.modelName,
      optimalContextTokens: agg.avgContextTokens,
      avgResponseTimeMs: agg.avgResponseMs,
      successRate: agg.successRate,
      sampleCount: agg.sampleCount,
    }).onConflictDoUpdate({
      target: schema.modelProfileOverrides.modelName,
      set: {
        optimalContextTokens: agg.avgContextTokens,
        avgResponseTimeMs: agg.avgResponseMs,
        successRate: agg.successRate,
        sampleCount: agg.sampleCount,
        lastUpdated: new Date(),
      },
    });
    updated++;
  }

  console.log(`[model-tuner] Updated ${updated} model profiles from ${aggregates.length} models`);
  return { updated };
}

/** Auto-trigger if last update > 7 days ago */
export async function maybeAutoTune(): Promise<void> {
  try {
    const latest = await db.select({
      lastUpdated: sql<Date>`max(last_updated)`,
    }).from(schema.modelProfileOverrides);

    const lastUpdate = latest[0]?.lastUpdated;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (!lastUpdate || new Date(lastUpdate) < sevenDaysAgo) {
      console.log('[model-tuner] Auto-triggering aggregation (last update > 7 days ago)');
      await runModelProfileAggregation();
    }
  } catch (e) {
    console.error('[model-tuner] Auto-tune check failed:', e);
  }
}
