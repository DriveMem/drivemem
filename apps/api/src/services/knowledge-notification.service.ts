/**
 * Knowledge Activity Push — in-app notifications for knowledge events.
 * Uses composite type field (e.g. 'knowledge_activity:file_indexed') to store subtype
 * without altering the notifications table schema.
 */

import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { and, eq, gt, sql } from 'drizzle-orm';

const DAILY_CAP = 5;
const MERGE_WINDOW_MS: Record<string, number> = {
  file_indexed: 4 * 60 * 60 * 1000,    // 4 hours
  connector_sync: 4 * 60 * 60 * 1000,  // 4 hours
  files_stale: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function createKnowledgeNotification(params: {
  userId: string;
  subtype: 'file_indexed' | 'connector_sync' | 'files_stale';
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<boolean> {
  const { userId, subtype, title, message } = params;
  const compositeType = `knowledge_activity:${subtype}`;

  // 1. Daily cap: count today's knowledge_activity:* notifications
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        sql`${schema.notifications.type} LIKE 'knowledge_activity:%'`,
        gt(schema.notifications.createdAt, startOfDay),
      ),
    );

  if (Number(count) >= DAILY_CAP) {
    console.log(`[knowledge-notification] Daily cap reached for user ${userId}`);
    return false;
  }

  // 2. Merge window: check for recent notification with same composite type
  const windowMs = MERGE_WINDOW_MS[subtype] ?? 4 * 60 * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);

  const [recent] = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.type, compositeType),
        gt(schema.notifications.createdAt, windowStart),
      ),
    )
    .limit(1);

  if (recent) {
    console.log(`[knowledge-notification] Merge window hit for ${compositeType}, user ${userId}`);
    return false;
  }

  // 3. Insert notification
  await db.insert(schema.notifications).values({
    userId,
    type: compositeType,
    title,
    message,
  });

  console.log(`[knowledge-notification] Created ${compositeType} for user ${userId}`);
  return true;
}
