import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface HandoffForWebhook {
  id: string;
  from_user_id: string;
  to_user_id: string;
  context_pack: any;
}

export async function notifyHandoffRecipient(
  handoff: HandoffForWebhook,
  targetUserId: string,
  event: 'handoff.received' | 'handoff.request_more' | 'handoff.supplement'
): Promise<void> {
  try {
    const [user] = await db
      .select({ webhookUrl: users.webhookUrl })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!user?.webhookUrl) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch(user.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        event,
        handoff_id: handoff.id,
        from_user_id: handoff.from_user_id,
        to_user_id: handoff.to_user_id,
        summary: handoff.context_pack?.task || '',
        timestamp: new Date().toISOString(),
      }),
    });

    clearTimeout(timeout);
  } catch (err) {
    console.error('[handoff-webhook] Failed to notify:', err);
  }
}
