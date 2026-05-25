export interface WebhookPayload {
  event: string;
  handoff_id: string;
  from_user_id: string;
  to_user_id: string;
  summary?: string;
  timestamp: string;
  missing?: string[];
  score?: number;
  reasoning?: string;
  quality_warning?: string;
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
    });

    clearTimeout(timeout);
  } catch (err) {
    console.error(`[handoff-webhook] Failed to deliver ${payload.event}:`, err);
  }
}
