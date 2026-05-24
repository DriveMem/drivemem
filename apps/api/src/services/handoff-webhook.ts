<<<<<<< HEAD
export interface WebhookPayload {
  event: string;
  handoff_id: string;
  from_user_id: string;
  to_user_id: string;
  summary: string;
  timestamp: string;
}

export async function notifyHandoffRecipient(
  webhookUrl: string | undefined | null,
  payload: WebhookPayload
): Promise<void> {
  if (!webhookUrl) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
=======
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
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
    });

    clearTimeout(timeout);
  } catch (err) {
<<<<<<< HEAD
    console.error(`[handoff-webhook] Failed to deliver ${payload.event}:`, err);
=======
    console.error('[handoff-webhook] Failed to notify:', err);
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
  }
}
