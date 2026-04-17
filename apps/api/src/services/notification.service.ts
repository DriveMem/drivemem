import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { and, eq, gt } from 'drizzle-orm';

/**
 * Create a notification with 24h deduplication.
 * If a notification with the same userId + type + title exists within the last 24h,
 * update it instead of creating a duplicate (UX #246 F4).
 */
export async function createNotificationDeduped(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
}) {
  const { userId, type, title, message } = params;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check for existing notification with same userId + type + title within 24h
  const [existing] = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.type, type),
        eq(schema.notifications.title, title),
        gt(schema.notifications.createdAt, oneDayAgo)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing: refresh message and timestamp, mark unread
    await db
      .update(schema.notifications)
      .set({
        message,
        read: false,
        createdAt: new Date(),
      })
      .where(eq(schema.notifications.id, existing.id));
    console.log(`[notification] Deduped ${type} for user ${userId} (updated existing ${existing.id})`);
  } else {
    // Insert new
    await db.insert(schema.notifications).values({
      userId,
      type,
      title,
      message,
    });
    console.log(`[notification] Created ${type} for user ${userId}`);
  }
}
