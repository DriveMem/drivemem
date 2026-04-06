import { createHmac } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function dispatchWebhook(userId: string, event: string, payload: Record<string, unknown>) {
  const hooks = await db.select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.userId, userId));

  for (const hook of hooks) {
    if (!hook.active || !hook.events.includes(event)) continue;

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AIDrive-Signature': signature,
          'X-AIDrive-Event': event,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      console.warn(`[webhook] Failed to deliver to ${hook.url}:`, (err as Error).message);
    }
  }
}
