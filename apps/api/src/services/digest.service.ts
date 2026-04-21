/**
 * Weekly Digest Email Service
 * 
 * Sends weekly digest emails every Monday 9am UTC to active users.
 * Content: new files, insights discovered, suggested questions, activity summary.
 */

import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql, gte, isNull, desc } from 'drizzle-orm';
import { Resend } from 'resend';
import crypto from 'crypto';
import { trackServerEvent } from '../lib/analytics.js';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://drivemem.cloud';
const API_URL = process.env.API_URL || 'https://api.drivemem.cloud';
const FROM_EMAIL = 'DriveMem <hello@drivemem.cloud>';

interface DigestData {
  filesAdded: number;
  filesTotal: number;
  newFiles: { name: string; summary: string | null }[];
  insightsCount: number;
  topInsight: string | null;
  insightTitles: string[];
  conversationsCount: number;
  agentCalls: number;
  suggestedQuestions: string[];
}

async function gatherDigestData(userId: string, since: Date): Promise<DigestData> {
  // New files this week
  // Get total count of new files this week (for "+N more")
  const [newFilesCount] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(schema.files).where(and(
    eq(schema.files.userId, userId),
    gte(schema.files.createdAt, since),
    isNull(schema.files.deletedAt),
  ));

  const newFiles = await db.select({
    name: schema.files.name,
    summary: schema.files.summary,
  }).from(schema.files).where(and(
    eq(schema.files.userId, userId),
    gte(schema.files.createdAt, since),
    isNull(schema.files.deletedAt),
  )).orderBy(desc(schema.files.createdAt)).limit(5);

  const [filesStats] = await db.select({
    total: sql<number>`count(*)::int`,
  }).from(schema.files).where(and(
    eq(schema.files.userId, userId),
    isNull(schema.files.deletedAt),
  ));

  // New insights
  const newInsights = await db.select({
    title: schema.insights.title,
  }).from(schema.insights).where(and(
    eq(schema.insights.userId, userId),
    sql`${schema.insights.createdAt} >= ${since}`,
  )).orderBy(desc(schema.insights.createdAt)).limit(5);

  // Conversations this week
  const [convStats] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(schema.conversations).where(and(
    eq(schema.conversations.userId, userId),
    gte(schema.conversations.createdAt, since),
  ));

  // Agent calls (user messages) this week
  const [agentCallStats] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(schema.messages)
    .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
    .where(and(
      eq(schema.conversations.userId, userId),
      gte(schema.messages.createdAt, since),
      eq(schema.messages.role, 'user'),
    ));

  // Generate personalized suggested questions based on file names
  const suggestedQuestions: string[] = [];
  if (newFiles.length > 0) {
    const sampleName = newFiles[0].name;
    suggestedQuestions.push(`What are the key takeaways from "${sampleName}"?`);
    if (newFiles.length > 1) {
      suggestedQuestions.push(`Compare the themes in "${newFiles[0].name}" and "${newFiles[1].name}"`);
    }
  }
  if (newInsights.length > 0) {
    suggestedQuestions.push(`Explain the insight: ${newInsights[0].title}`);
  }
  if ((filesStats?.total ?? 0) > 5) {
    suggestedQuestions.push(`What connections exist between my documents?`);
  }

  const totalNewFiles = newFilesCount?.count ?? newFiles.length;

  return {
    filesAdded: totalNewFiles,
    filesTotal: filesStats?.total ?? 0,
    newFiles: newFiles.map(f => ({ name: f.name, summary: f.summary })),
    insightsCount: newInsights.length,
    topInsight: newInsights.length > 0 ? newInsights[0].title : null,
    insightTitles: newInsights.length > 1 ? newInsights.slice(1).map(i => i.title) : [],
    conversationsCount: convStats?.count ?? 0,
    agentCalls: agentCallStats?.count ?? 0,
    suggestedQuestions,
  };
}

function buildDigestEmailHtml(data: DigestData, unsubscribeUrl: string, trackingPixelUrl: string): string {
  const filesList = data.newFiles.length > 0
    ? data.newFiles.map(f => {
        const summary = f.summary ? ` — <span style="color:#666;">${escapeHtml(f.summary.slice(0, 80))}</span>` : '';
        return `<li style="margin:4px 0;font-size:14px;">${escapeHtml(f.name)}${summary}</li>`;
      }).join('')
    : '<li style="color:#999;font-size:14px;">No new files this week</li>';

  const moreFilesHtml = data.filesAdded > 5
    ? `<p style="margin:4px 0 0 20px;font-size:13px;"><a href="${FRONTEND_URL}/files" style="color:#2563eb;text-decoration:none;">and ${data.filesAdded - 5} more →</a></p>`
    : '';

  const insightsList = data.insightTitles.length > 0
    ? data.insightTitles.map(t => `<li style="margin:4px 0;font-size:14px;">${escapeHtml(t)}</li>`).join('')
    : '';

  const topInsightHtml = data.topInsight
    ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:20px;">
  <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:4px;">💡 TOP INSIGHT</div>
  <div style="font-size:16px;font-weight:600;color:#78350f;">${escapeHtml(data.topInsight)}</div>
</div>`
    : '';

  const questionsList = data.suggestedQuestions.length > 0
    ? data.suggestedQuestions.map(q =>
      `<li style="margin:4px 0;"><a href="${FRONTEND_URL}/chat?new=1&q=${encodeURIComponent(q)}" style="color:#2563eb;text-decoration:none;font-size:14px;">${escapeHtml(q)}</a></li>`
    ).join('')
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#f9fafb;">

<div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">

<h1 style="font-size:20px;margin:0 0 4px;color:#1a1a1a;">Your knowledge grew this week 🌱</h1>
<p style="font-size:13px;color:#999;margin:0 0 24px;">Here's what happened in your knowledge base this week</p>

<!-- Stats Grid -->
<div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
  <div style="flex:1;min-width:100px;background:#f0f9ff;border-radius:8px;padding:16px;text-align:center;">
    <div style="font-size:24px;font-weight:700;color:#2563eb;">${data.filesAdded}</div>
    <div style="font-size:12px;color:#666;">Files Added</div>
  </div>
  <div style="flex:1;min-width:100px;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
    <div style="font-size:24px;font-weight:700;color:#16a34a;">${data.insightsCount}</div>
    <div style="font-size:12px;color:#666;">Insights</div>
  </div>
  <div style="flex:1;min-width:100px;background:#fdf4ff;border-radius:8px;padding:16px;text-align:center;">
    <div style="font-size:24px;font-weight:700;color:#9333ea;">${data.agentCalls}</div>
    <div style="font-size:12px;color:#666;">Questions Asked</div>
  </div>
</div>

${data.newFiles.length > 0 ? `
<!-- New Files -->
<div style="margin-bottom:20px;">
  <h3 style="font-size:14px;margin:0 0 8px;color:#374151;">📁 New Files</h3>
  <ul style="margin:0;padding-left:20px;">${filesList}</ul>
  ${moreFilesHtml}
</div>` : ''}

${topInsightHtml}

${data.insightTitles.length > 0 ? `
<!-- More Insights -->
<div style="margin-bottom:20px;">
  <h3 style="font-size:14px;margin:0 0 8px;color:#374151;">💡 More Insights</h3>
  <ul style="margin:0;padding-left:20px;">${insightsList}</ul>
</div>` : ''}

${data.suggestedQuestions.length > 0 ? `
<!-- Suggested Questions -->
<div style="margin-bottom:24px;">
  <h3 style="font-size:14px;margin:0 0 8px;color:#374151;">❓ Try Asking</h3>
  <ul style="margin:0;padding-left:20px;list-style:none;">${questionsList}</ul>
</div>` : ''}

<div style="text-align:center;margin-top:24px;">
  <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Open Your Knowledge Base</a>
</div>

<p style="margin-top:8px;text-align:center;font-size:12px;color:#999;">
  Total knowledge base: ${data.filesTotal} files
</p>

</div>

<p style="margin-top:20px;font-size:11px;color:#999;text-align:center;">
  You're receiving this weekly digest because you use DriveMem.<br>
  <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe from weekly digests</a>
</p>

<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body></html>`;
}

function buildDigestEmailText(data: DigestData, unsubscribeUrl: string): string {
  let text = `🌱 Your knowledge grew this week\n\n`;
  text += `Files Added: ${data.filesAdded} | Insights: ${data.insightsCount} | Questions Asked: ${data.agentCalls}\n\n`;

  if (data.newFiles.length > 0) {
    text += `📁 New Files:\n`;
    data.newFiles.forEach(f => {
      const summary = f.summary ? ` — ${f.summary.slice(0, 80)}` : '';
      text += `  - ${f.name}${summary}\n`;
    });
    if (data.filesAdded > 5) {
      text += `  ... and ${data.filesAdded - 5} more\n`;
    }
    text += '\n';
  }

  if (data.topInsight) {
    text += `💡 Top Insight: ${data.topInsight}\n\n`;
  }

  if (data.insightTitles.length > 0) {
    text += `💡 More Insights:\n`;
    data.insightTitles.forEach(t => { text += `  - ${t}\n`; });
    text += '\n';
  }

  if (data.suggestedQuestions.length > 0) {
    text += `❓ Try Asking:\n`;
    data.suggestedQuestions.forEach(q => { text += `  - ${q}: ${FRONTEND_URL}/chat?new=1&q=${encodeURIComponent(q)}\n`; });
    text += '\n';
  }

  text += `Open your knowledge base: ${FRONTEND_URL}/dashboard\n\n`;
  text += `Unsubscribe: ${unsubscribeUrl}\n`;
  return text;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Run the weekly digest email job.
 * Sends digest to all active users (activity in past 30 days) who haven't unsubscribed.
 */
export async function runWeeklyDigest(): Promise<{ processed: number; sent: number; skipped: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get users with activity in past 30 days (lastActiveAt or recent file/conversation)
  const activeUsers = await db.select({
    id: schema.users.id,
    email: schema.users.email,
    name: schema.users.name,
    notificationPreferences: schema.users.notificationPreferences,
  }).from(schema.users).where(
    sql`(${schema.users.lastActiveAt} >= ${thirtyDaysAgo} OR ${schema.users.createdAt} >= ${thirtyDaysAgo})`
  );

  let processed = 0;
  let sent = 0;
  let skipped = 0;

  for (const user of activeUsers) {
    processed++;

    // Check unsubscribe via notificationPreferences
    const prefs = (user.notificationPreferences as Record<string, any>) || {};
    if (prefs.weeklyDigestUnsubscribed) {
      skipped++;
      continue;
    }

    try {
      const data = await gatherDigestData(user.id, sevenDaysAgo);

      // Skip if user has zero activity this week (nothing to report)
      if (data.filesAdded === 0 && data.insightsCount === 0 && data.agentCalls === 0 && data.conversationsCount === 0) {
        skipped++;
        continue;
      }

      // Generate unsubscribe token (deterministic per user for idempotency)
      const unsubToken = crypto.createHash('sha256').update(`digest-unsub-${user.id}-${process.env.RESEND_API_KEY || 'salt'}`).digest('hex').slice(0, 48);
      const unsubscribeUrl = `${API_URL}/api/v1/digest/unsubscribe?token=${unsubToken}&uid=${user.id}`;
      const trackingPixelUrl = `${API_URL}/api/v1/digest/opened?uid=${user.id}&t=${Date.now()}`;

      const html = buildDigestEmailHtml(data, unsubscribeUrl, trackingPixelUrl);
      const text = buildDigestEmailText(data, unsubscribeUrl);

      const subject = data.filesAdded > 0
        ? `Your knowledge grew this week 🌱 — ${data.filesAdded} new files`
        : `Your knowledge grew this week 🌱 — ${data.insightsCount} new insights`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject,
        html,
        text,
      });

      trackServerEvent('digest_email_sent', { userId: user.id });
      sent++;
      console.log(`[digest] Sent weekly digest to ${user.email}`);
    } catch (err) {
      console.error(`[digest] Failed to send to ${user.email}:`, err);
    }
  }

  console.log(`[digest] Weekly digest complete: ${processed} processed, ${sent} sent, ${skipped} skipped`);
  return { processed, sent, skipped };
}

/**
 * Verify unsubscribe token for a user
 */
export function verifyUnsubToken(uid: string, token: string): boolean {
  const expected = crypto.createHash('sha256').update(`digest-unsub-${uid}-${process.env.RESEND_API_KEY || 'salt'}`).digest('hex').slice(0, 48);
  return token === expected;
}

/**
 * Unsubscribe a user from weekly digest emails
 */
export async function unsubscribeDigest(uid: string): Promise<boolean> {
  const [user] = await db.select({ id: schema.users.id, notificationPreferences: schema.users.notificationPreferences })
    .from(schema.users).where(eq(schema.users.id, uid)).limit(1);

  if (!user) return false;

  const prefs = (user.notificationPreferences as Record<string, any>) || {};
  prefs.weeklyDigestUnsubscribed = true;

  await db.update(schema.users)
    .set({ notificationPreferences: prefs, updatedAt: new Date() })
    .where(eq(schema.users.id, uid));

  return true;
}
