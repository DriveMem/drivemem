import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { Queue } from 'bullmq';

type Integration = typeof schema.integrations.$inferSelect;

interface GitHubSyncConfig {
  syncEnabled: boolean;
  lastSyncAt: string | null;
  syncedIssueUrls: string[];
}

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

async function ghFetch(path: string, token: string): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} returned ${res.status}`);
  }
  return res.json();
}

function issueToMarkdown(repo: string, issue: any, comments: any[]): string {
  const type = issue.pull_request ? 'Pull Request' : 'Issue';
  const lines: string[] = [
    `# [${type}] ${issue.title}`,
    '',
    `**Repo:** ${repo}  `,
    `**State:** ${issue.state}  `,
    `**Author:** ${issue.user?.login || 'unknown'}  `,
    `**Created:** ${issue.created_at}  `,
    `**Updated:** ${issue.updated_at}  `,
    `**URL:** ${issue.html_url}`,
    '',
  ];

  if (issue.labels?.length) {
    lines.push(`**Labels:** ${issue.labels.map((l: any) => l.name).join(', ')}`, '');
  }

  if (issue.body) {
    lines.push('## Description', '', issue.body, '');
  }

  if (comments.length > 0) {
    lines.push('## Comments', '');
    for (const c of comments) {
      lines.push(`### ${c.user?.login || 'unknown'} (${c.created_at})`, '', c.body || '_empty_', '');
    }
  }

  lines.push('---', `_Source: GitHub | Synced: ${new Date().toLocaleString('zh-CN')}_`);
  return lines.join('\n');
}

/**
 * Sync GitHub repos, issues, and PRs for a given integration.
 */
export async function syncGitHubRepos(integration: Integration): Promise<SyncResult> {
  const token = integration.accessToken;
  const cfg = (integration.config as GitHubSyncConfig) || { syncEnabled: true, lastSyncAt: null, syncedIssueUrls: [] };

  if (!cfg.syncEnabled) {
    return { synced: 0, skipped: 0, errors: 0 };
  }

  const previouslySynced = new Set(cfg.syncedIssueUrls || []);
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };
  const allSyncedUrls: string[] = [...previouslySynced];

  const parseQueue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });

  try {
    // 1. Get recent repos
    const repos: any[] = await ghFetch('/user/repos?sort=pushed&per_page=10&type=owner', token);

    for (const repo of repos) {
      const fullName = repo.full_name;
      try {
        // 2. Get issues (includes PRs on GitHub API)
        const issues: any[] = await ghFetch(`/repos/${fullName}/issues?state=all&sort=updated&per_page=10`, token);

        for (const issue of issues) {
          const url = issue.html_url as string;

          // Skip if already synced and not updated since last sync
          if (previouslySynced.has(url) && cfg.lastSyncAt && issue.updated_at <= cfg.lastSyncAt) {
            result.skipped++;
            if (!allSyncedUrls.includes(url)) allSyncedUrls.push(url);
            continue;
          }

          try {
            // Fetch comments (first 5)
            let comments: any[] = [];
            if (issue.comments > 0) {
              comments = await ghFetch(`/repos/${fullName}/issues/${issue.number}/comments?per_page=5`, token);
            }

            const type = issue.pull_request ? 'pr' : 'issue';
            const markdown = issueToMarkdown(fullName, issue, comments);
            const buffer = Buffer.from(markdown, 'utf-8');

            const fileId = crypto.randomUUID();
            const slug = issue.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'github-item';
            const filename = `${slug}-github-${type}.md`;
            const s3Key = `users/${integration.userId}/files/${fileId}/${filename}`;

            const { uploadObject } = await import('./s3.service.js');
            await uploadObject(s3Key, buffer, 'text/markdown');

            await db.insert(schema.files).values({
              id: fileId,
              name: `[GitHub] ${issue.title}`,
              originalName: filename,
              mimeType: 'text/markdown',
              size: buffer.length,
              status: 'parsing',
              userId: integration.userId,
              s3Key,
              source: 'connector',
            });

            await parseQueue.add('parse', { fileId, userId: integration.userId, s3Key, mimeType: 'text/markdown' });

            if (!allSyncedUrls.includes(url)) allSyncedUrls.push(url);
            result.synced++;
          } catch {
            result.errors++;
          }
        }
      } catch {
        result.errors++;
      }
    }
  } finally {
    await parseQueue.close();
  }

  // Update integration config
  await db.update(schema.integrations)
    .set({
      config: {
        syncEnabled: cfg.syncEnabled,
        lastSyncAt: new Date().toISOString(),
        syncedIssueUrls: allSyncedUrls,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.integrations.id, integration.id));

  return result;
}
