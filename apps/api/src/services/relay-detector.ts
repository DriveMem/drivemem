import { db } from '../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { logActivity } from './activity-logger.js';

export interface RelayEvent {
  fromAgent: string;
  toAgent: string;
  fileId: string;
  fileName: string;
  action: 'relay';
}

/**
 * Detect cross-agent knowledge relay: when Agent B searches/asks and hits files
 * that were originally stored by a different Agent A, that's a "relay".
 */
export async function detectRelay(
  userId: string,
  currentAgent: string,
  fileIds: string[],
): Promise<RelayEvent[]> {
  if (!currentAgent || fileIds.length === 0) return [];

  try {
    // Find store/upload activity logs for these files where a different agent created them
    const logs = await db
      .select({
        agentName: schema.apiActivityLogs.agentName,
        relatedFileIds: schema.apiActivityLogs.relatedFileIds,
        detail: schema.apiActivityLogs.detail,
      })
      .from(schema.apiActivityLogs)
      .where(
        and(
          eq(schema.apiActivityLogs.userId, userId),
          eq(schema.apiActivityLogs.action, 'store'),
        ),
      );

    // Build a map: fileId -> agent that stored it
    const fileOriginAgent: Record<string, string> = {};
    for (const log of logs) {
      if (!log.agentName) continue;
      const ids = log.relatedFileIds as string[] | null;
      if (ids && Array.isArray(ids)) {
        for (const fid of ids) {
          // First agent to store wins (origin)
          if (!fileOriginAgent[fid]) {
            fileOriginAgent[fid] = log.agentName;
          }
        }
      }
    }

    // Also check file creator via files table for files not found in logs
    const missingIds = fileIds.filter(id => !fileOriginAgent[id]);
    if (missingIds.length > 0) {
      const files = await db
        .select({ id: schema.files.id, name: schema.files.name })
        .from(schema.files)
        .where(inArray(schema.files.id, missingIds));
      // These files weren't stored by any agent via API, skip them
    }

    // Get file names for relay events
    const relayFileIds = fileIds.filter(
      id => fileOriginAgent[id] && fileOriginAgent[id] !== currentAgent,
    );
    if (relayFileIds.length === 0) return [];

    const files = await db
      .select({ id: schema.files.id, name: schema.files.name })
      .from(schema.files)
      .where(inArray(schema.files.id, relayFileIds));

    const fileNameMap: Record<string, string> = {};
    for (const f of files) {
      fileNameMap[f.id] = f.name;
    }

    return relayFileIds.map(fid => ({
      fromAgent: fileOriginAgent[fid],
      toAgent: currentAgent,
      fileId: fid,
      fileName: fileNameMap[fid] || 'unknown',
      action: 'relay' as const,
    }));
  } catch (e) {
    console.error('[relay-detector] Failed:', e);
    return [];
  }
}

/**
 * Fire-and-forget: detect relays and log them as activity entries.
 */
export function detectAndLogRelay(
  userId: string,
  currentAgent: string,
  fileIds: string[],
  apiKeyId?: string,
): void {
  detectRelay(userId, currentAgent, fileIds)
    .then(relays => {
      for (const relay of relays) {
        logActivity({
          userId,
          apiKeyId,
          agentName: relay.toAgent,
          action: 'relay',
          detail: relay.fileName,
          metadata: {
            fromAgent: relay.fromAgent,
            toAgent: relay.toAgent,
            fileName: relay.fileName,
          },
          relatedFileIds: [relay.fileId],
        });
      }
    })
    .catch(e => console.error('[relay-detector] fire-and-forget error:', e));
}
