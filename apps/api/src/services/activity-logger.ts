import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

export async function logActivity(params: {
  userId: string;
  apiKeyId?: string;
  agentName?: string;
  action: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  relatedFileIds?: string[];
}) {
  try {
    await db.insert(schema.apiActivityLogs).values({
      userId: params.userId,
      apiKeyId: params.apiKeyId || null,
      agentName: params.agentName || null,
      action: params.action,
      detail: params.detail || null,
      metadata: params.metadata || null,
      relatedFileIds: params.relatedFileIds || null,
    });
  } catch (e) {
    console.error('[activity-logger] Failed to log:', e);
  }
}
