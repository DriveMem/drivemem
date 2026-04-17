import { db } from '../db/index.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/** Dedup window: skip insert if same actor+action+detail exists within this period */
const DEDUP_WINDOW_MS = 60_000; // 1 minute

export async function logActivity(params: {
  userId: string;
  apiKeyId?: string;
  agentName?: string;
  action: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  relatedFileIds?: string[];
}) {
  try {
    // Idempotent dedup: if an identical activity (same user + action + detail)
    // was logged within the last minute, update its timestamp instead of inserting.
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

    const conditions = [
      eq(schema.apiActivityLogs.userId, params.userId),
      eq(schema.apiActivityLogs.action, params.action),
      gte(schema.apiActivityLogs.createdAt, cutoff),
    ];

    // Match detail (nullable) — treat null/undefined detail as matching other null details
    if (params.detail) {
      conditions.push(eq(schema.apiActivityLogs.detail, params.detail));
    } else {
      conditions.push(sql`${schema.apiActivityLogs.detail} IS NULL`);
    }

    // Match agentName for accurate dedup across different agents
    if (params.agentName) {
      conditions.push(eq(schema.apiActivityLogs.agentName, params.agentName));
    } else {
      conditions.push(sql`${schema.apiActivityLogs.agentName} IS NULL`);
    }

    const [existing] = await db
      .select({ id: schema.apiActivityLogs.id })
      .from(schema.apiActivityLogs)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      // Update timestamp + metadata of existing entry instead of creating a duplicate
      await db
        .update(schema.apiActivityLogs)
        .set({
          createdAt: new Date(),
          metadata: params.metadata || null,
        })
        .where(eq(schema.apiActivityLogs.id, existing.id));
      return;
    }

    await db.insert(schema.apiActivityLogs).values({
      userId: params.userId,
      apiKeyId: params.apiKeyId || null,
      agentName: params.agentName || null,
      action: params.action,
      detail: params.detail || null,
      metadata: params.metadata || null,
      relatedFileIds: params.relatedFileIds || null,
    });
  } catch (e) {
    console.error('[activity-logger] Failed to log:', e);
  }
}
