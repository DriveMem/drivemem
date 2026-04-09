import { createHmac } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RETRY_DELAYS = [30_000, 300_000, 1_800_000]; // 30s, 5min, 30min
const TIMEOUT_MS = 10_000;

async function deliverWithRetry(
  hook: { url: string; secret: string },
  body: string,
  signature: string,
  event: string,
  attempt = 0
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
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

    if (res.ok || res.status < 500) {
      return { success: res.ok, statusCode: res.status };
    }

    // Server error — retry if attempts remain
    if (attempt < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[attempt];
      console.log(`[webhook] Retry ${attempt + 1} for ${hook.url} in ${delay / 1000}s`);
      setTimeout(() => deliverWithRetry(hook, body, signature, event, attempt + 1), delay);
      return { success: false, statusCode: res.status, error: `Retrying (attempt ${attempt + 1})` };
    }

    return { success: false, statusCode: res.status, error: 'Max retries exceeded' };
  } catch (err) {
    const errorMsg = (err as Error).message || 'Unknown error';

    if (attempt < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[attempt];
      console.log(`[webhook] Retry ${attempt + 1} for ${hook.url} in ${delay / 1000}s (${errorMsg})`);
      setTimeout(() => deliverWithRetry(hook, body, signature, event, attempt + 1), delay);
      return { success: false, error: `${errorMsg} — retrying (attempt ${attempt + 1})` };
    }

    return { success: false, error: `${errorMsg} — max retries exceeded` };
  }
}

export async function dispatchWebhook(userId: string, event: string, payload: Record<string, unknown>) {
  const hooks = await db.select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.userId, userId));

  for (const hook of hooks) {
    if (!hook.active || !hook.events.includes(event)) continue;

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

    const result = await deliverWithRetry(hook, body, signature, event);

    if (!result.success) {
      console.warn(`[webhook] Delivery failed to ${hook.url}: ${result.error || result.statusCode}`);
    }
  }
}
