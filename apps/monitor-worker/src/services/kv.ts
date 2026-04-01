import type { Heartbeat } from '@ai-drive/shared-types';

export async function getHeartbeat(
  kv: KVNamespace,
  agentId: string
): Promise<Heartbeat | null> {
  try {
    const value = await kv.get(`heartbeat:${agentId}`);
    if (!value) return null;
    return JSON.parse(value) as Heartbeat;
  } catch {
    return null;
  }
}
