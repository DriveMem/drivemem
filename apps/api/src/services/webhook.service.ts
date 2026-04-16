import { createHmac } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RETRY_DELAYS = [30_000, 300_000, 1_800_000]; // 30s, 5min, 30min
const TIMEOUT_MS = 10_000;

async function logDelivery(
  webhookId: string,
  userId: string,
  event: string,
  url: string,
  result: { success: boolean; statusCode?: number; duration?: number; error?: string }
) {
  try {
    await db.insert(schema.webhookDeliveries).values({
      webhookId,
      userId,
      event,
      url,
      success: result.success,
      statusCode: result.statusCode ?? null,
      duration: result.duration ?? null,
      error: result.error ?? null,
    });
  } catch (err) {
    console.warn(`[webhook] Failed to log delivery:`, (err as Error).message);
  }
}

async function deliverWithRetry(
  hook: { id: string; url: string; secret: string; userId: string },
  event: string,
  body: string,
  signature: string,
  attempt = 0
): Promise<{ success: boolean; statusCode?: number; duration?: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIDrive-Signature': `sha256=${signature}`,
        'X-AIDrive-Event': event,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const duration = Date.now() - start;

    if (res.ok || res.status < 500) {
      const result = { success: res.ok, statusCode: res.status, duration };
      await logDelivery(hook.id, hook.userId, event, hook.url, result);
      return result;
    }

    // Server error — retry if attempts remain
    if (attempt < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[attempt];
      console.log(`[webhook] Retry ${attempt + 1} for ${hook.url} in ${delay / 1000}s`);
      setTimeout(() => deliverWithRetry(hook, event, body, signature, attempt + 1), delay);
      const result = { success: false, statusCode: res.status, duration, error: `Retrying (attempt ${attempt + 1})` };
      await logDelivery(hook.id, hook.userId, event, hook.url, result);
      return result;
    }

    const result = { success: false, statusCode: res.status, duration, error: 'Max retries exceeded' };
    await logDelivery(hook.id, hook.userId, event, hook.url, result);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    const errorMsg = (err as Error).message || 'Unknown error';

    if (attempt < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[attempt];
      console.log(`[webhook] Retry ${attempt + 1} for ${hook.url} in ${delay / 1000}s (${errorMsg})`);
      setTimeout(() => deliverWithRetry(hook, event, body, signature, attempt + 1), delay);
      const result = { success: false, duration, error: `${errorMsg} — retrying (attempt ${attempt + 1})` };
      await logDelivery(hook.id, hook.userId, event, hook.url, result);
      return result;
    }

    const result = { success: false, duration, error: `${errorMsg} — max retries exceeded` };
    await logDelivery(hook.id, hook.userId, event, hook.url, result);
    return result;
  }
}

export async function dispatchWebhook(userId: string, event: string, payload: Record<string, unknown>) {
  const hooks = await db.select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.userId, userId));

  for (const hook of hooks) {
    if (!hook.active || !hook.events.includes(event)) continue;

    // Check subscriptions — if hook has subscriptions, only dispatch if event matches a filter
    const subscriptions = await db.select()
      .from(schema.webhookSubscriptions)
      .where(eq(schema.webhookSubscriptions.webhookId, hook.id));

    if (subscriptions.length > 0) {
      const matches = subscriptions.some(sub => {
        if (sub.eventType !== '*' && sub.eventType !== event) return false;
        if (sub.projectId && payload.projectId && sub.projectId !== payload.projectId) return false;
        if (sub.tags && Array.isArray(sub.tags) && (sub.tags as string[]).length > 0) {
          const payloadTags = (payload.tags as string[]) || [];
          if (!(sub.tags as string[]).some((t: string) => payloadTags.includes(t))) return false;
        }
        return true;
      });
      if (!matches) continue;
    }

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

    const result = await deliverWithRetry(
      { id: hook.id, url: hook.url, secret: hook.secret, userId },
      event, body, signature
    );

    if (!result.success) {
      console.warn(`[webhook] Delivery failed to ${hook.url}: ${result.error || result.statusCode}`);
    }
  }
}
