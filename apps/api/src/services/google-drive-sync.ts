import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { Queue } from 'bullmq';
import { config } from '../lib/config.js';

type Integration = typeof schema.integrations.$inferSelect;

interface GoogleDriveSyncConfig {
  syncEnabled: boolean;
  lastSyncAt: string | null;
  syncedFileIds: string[];
}

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

const SUPPORTED_MIME_TYPES = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/pdf',
  'text/plain',
  'text/markdown',
]);

/**
 * Refresh Google access token using refresh_token.
 */
async function refreshAccessToken(integration: Integration): Promise<string> {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID || '',
      client_secret: config.GOOGLE_CLIENT_SECRET || '',
      refresh_token: integration.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };

  await db.update(schema.integrations)
    .set({ accessToken: data.access_token, updatedAt: new Date() })
    .where(eq(schema.integrations.id, integration.id));

  return data.access_token;
}

/**
 * Get a valid access token, refreshing if needed.
 */
async function getValidToken(integration: Integration): Promise<string> {
  const testRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: `Bearer ${integration.accessToken}` },
  });

  if (testRes.ok) {
    return integration.accessToken;
  }

  if (testRes.status === 401 && integration.refreshToken) {
    return refreshAccessToken(integration);
  }

  throw new Error(`Google API returned ${testRes.status} and no refresh token available`);
}

async function downloadFileBuffer(fileId: string, mimeType: string, token: string): Promise<Buffer | null> {
  try {
    let url: string;
    if (mimeType === 'application/vnd.google-apps.document') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    } else {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

/**
 * Sync Google Drive documents for a given integration.
 */
export async function syncGoogleDrive(integration: Integration): Promise<SyncResult> {
  const cfg = (integration.config as GoogleDriveSyncConfig) || { syncEnabled: true, lastSyncAt: null, syncedFileIds: [] };

  if (!cfg.syncEnabled) {
    return { synced: 0, skipped: 0, errors: 0 };
  }

  const token = await getValidToken(integration);
  const previouslySynced = new Set(cfg.syncedFileIds || []);
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };
  const allSyncedIds: string[] = [...previouslySynced];

  const parseQueue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });

  try {
    const listUrl = new URL('https://www.googleapis.com/drive/v3/files');
    listUrl.searchParams.set('orderBy', 'modifiedTime desc');
    listUrl.searchParams.set('pageSize', '20');
    listUrl.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime)');
    listUrl.searchParams.set('q', "trashed = false and 'me' in owners");

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok) {
      throw new Error(`Drive API list failed: ${listRes.status}`);
    }

    const listData = await listRes.json() as { files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string }> };
    const files = listData.files || [];

    for (const file of files) {
      if (!SUPPORTED_MIME_TYPES.has(file.mimeType)) {
        continue;
      }

      if (previouslySynced.has(file.id) && cfg.lastSyncAt && file.modifiedTime <= cfg.lastSyncAt) {
        result.skipped++;
        if (!allSyncedIds.includes(file.id)) allSyncedIds.push(file.id);
        continue;
      }

      try {
        const buffer = await downloadFileBuffer(file.id, file.mimeType, token);
        if (!buffer || buffer.length === 0) {
          result.errors++;
          continue;
        }

        const fileId = crypto.randomUUID();
        const ext = file.mimeType === 'application/pdf' ? 'pdf'
          : file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'csv'
          : file.mimeType === 'text/markdown' ? 'md'
          : 'txt';
        const detectedMime = file.mimeType === 'application/pdf' ? 'application/pdf'
          : file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'text/csv'
          : 'text/plain';

        const slug = file.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'gdrive-file';
        const filename = `${slug}-gdrive.${ext}`;
        const s3Key = `users/${integration.userId}/files/${fileId}/${filename}`;

        const { uploadObject } = await import('./s3.service.js');
        await uploadObject(s3Key, buffer, detectedMime);

        await db.insert(schema.files).values({
          id: fileId,
          name: `[Google Drive] ${file.name}`,
          originalName: filename,
          mimeType: detectedMime,
          size: buffer.length,
          status: 'parsing',
          userId: integration.userId,
          s3Key,
        });

        await parseQueue.add('parse', { fileId, userId: integration.userId, s3Key, mimeType: detectedMime });

        if (!allSyncedIds.includes(file.id)) allSyncedIds.push(file.id);
        result.synced++;
      } catch {
        result.errors++;
      }
    }
  } finally {
    await parseQueue.close();
  }

  await db.update(schema.integrations)
    .set({
      config: {
        syncEnabled: cfg.syncEnabled,
        lastSyncAt: new Date().toISOString(),
        syncedFileIds: allSyncedIds,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.integrations.id, integration.id));

  // Notification: connector sync (knowledge activity push #128)
  if (result.synced > 0) {
    try {
      const { createKnowledgeNotification } = await import('./knowledge-notification.service.js');
      await createKnowledgeNotification({
        userId: integration.userId,
        subtype: 'connector_sync',
        title: '🔄 New files synced',
        message: `${result.synced} new file${result.synced > 1 ? 's' : ''} synced from Google Drive`,
      });
    } catch { /* non-blocking */ }
  }

  return result;
}
