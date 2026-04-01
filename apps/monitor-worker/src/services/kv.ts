import type { Heartbeat } from '@ai-drive/shared-types';

export async function getHeartbeat(
  r2: R2Bucket,
  agentId: string
): Promise<Heartbeat | null> {
  try {
    const obj = await r2.get(`heartbeats/${agentId}.json`);
    if (!obj) return null;
    const text = await obj.text();
    return JSON.parse(text) as Heartbeat;
  } catch {
    return null;
  }
}
