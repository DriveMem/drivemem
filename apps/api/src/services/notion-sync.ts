import { Client } from '@notionhq/client';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { Queue } from 'bullmq';

// Type for integration row
type Integration = typeof schema.integrations.$inferSelect;

interface SyncConfig {
  syncEnabled: boolean;
  lastSyncAt: string | null;
  syncedPageIds: string[];
}

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
  pageIds: string[];
}

/**
 * Convert Notion blocks to Markdown (simple subset).
 */
function blocksToMarkdown(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type;
    const richTexts = block[type]?.rich_text;
    const text = richTexts?.map((t: any) => t.plain_text).join('') ?? '';

    switch (type) {
      case 'heading_1':
        lines.push(`# ${text}`);
        break;
      case 'heading_2':
        lines.push(`## ${text}`);
        break;
      case 'heading_3':
        lines.push(`### ${text}`);
        break;
      case 'paragraph':
        lines.push(text);
        break;
      case 'bulleted_list_item':
        lines.push(`- ${text}`);
        break;
      case 'numbered_list_item':
        lines.push(`1. ${text}`);
        break;
      case 'code':
        lines.push(`\`\`\`${block.code?.language || ''}\n${text}\n\`\`\``);
        break;
      case 'quote':
        lines.push(`> ${text}`);
        break;
      case 'toggle':
        lines.push(`<details><summary>${text}</summary></details>`);
        break;
      case 'divider':
        lines.push('---');
        break;
      default:
        // Skip unsupported block types (table, embed, etc. — v2)
        if (text) lines.push(text);
        break;
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

/**
 * Sync Notion pages for a given integration.
 * Fetches all pages, converts to markdown, stores in DriveMem.
 */
export async function syncNotionPages(integration: Integration): Promise<SyncResult> {
  const notion = new Client({ auth: integration.accessToken });
  const config = (integration.config as SyncConfig) || { syncEnabled: true, lastSyncAt: null, syncedPageIds: [] };

  if (!config.syncEnabled) {
    return { synced: 0, skipped: 0, errors: 0, pageIds: config.syncedPageIds };
  }

  // Search for all pages
  const searchResponse = await notion.search({
    filter: { property: 'object', value: 'page' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
    page_size: 100,
  });

  const pages = searchResponse.results as any[];
  const previouslySynced = new Set(config.syncedPageIds || []);
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0, pageIds: [] };

  const parseQueue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });

  for (const page of pages) {
    const pageId = page.id;
    const lastEdited = page.last_edited_time;
    result.pageIds.push(pageId);

    // Skip if already synced and not edited since last sync
    if (previouslySynced.has(pageId) && config.lastSyncAt && lastEdited <= config.lastSyncAt) {
      result.skipped++;
      continue;
    }

    try {
      // Get page title
      const titleProp = page.properties?.title || page.properties?.Name;
      let title = 'Untitled';
      if (titleProp?.title?.[0]?.plain_text) {
        title = titleProp.title[0].plain_text;
      }

      // Fetch blocks
      const blocksResponse = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
      const markdown = blocksToMarkdown(blocksResponse.results);
      if (!markdown.trim()) {
        result.skipped++;
        continue;
      }

      const mdContent = `# ${title}\n\n${markdown}\n\n---\n_Source: Notion | Synced: ${new Date().toLocaleString('zh-CN')}_`;

      // Store as file in DriveMem
      const fileId = crypto.randomUUID();
      const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'notion-page';
      const filename = `${slug}-notion.md`;
      const s3Key = `users/${integration.userId}/files/${fileId}/${filename}`;
      const buffer = Buffer.from(mdContent, 'utf-8');

      const { uploadObject } = await import('./s3.service.js');
      await uploadObject(s3Key, buffer, 'text/markdown');

      await db.insert(schema.files).values({
        id: fileId,
        name: `[Notion] ${title}`,
        originalName: filename,
        mimeType: 'text/markdown',
        size: buffer.length,
        status: 'parsing',
        userId: integration.userId,
        s3Key,
      });

      await parseQueue.add('parse', { fileId, userId: integration.userId, s3Key, mimeType: 'text/markdown' });
      result.synced++;
    } catch (err) {
      result.errors++;
    }
  }

  // Update integration config
  await db.update(schema.integrations)
    .set({
      config: {
        syncEnabled: config.syncEnabled,
        lastSyncAt: new Date().toISOString(),
        syncedPageIds: result.pageIds,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.integrations.id, integration.id));

  return result;
}
