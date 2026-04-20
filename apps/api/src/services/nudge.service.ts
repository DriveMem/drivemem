/**
 * Activation Nudge Service
 * 
 * Manages the 7-day activation nudge sequence for new users.
 * Runs hourly, checks users registered within 7 days, sends email/notification nudges.
 */

import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, isNull, sql, gte } from 'drizzle-orm';
import { Resend } from 'resend';
import crypto from 'crypto';
import { createNotificationDeduped } from './notification.service.js';
import { trackServerEvent } from '../lib/analytics.js';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://drivemem.cloud';
const API_URL = process.env.API_URL || 'https://api.drivemem.cloud';
const FROM_EMAIL = 'DriveMem <hello@drivemem.cloud>';

// --- Activation check: 2 of 3 actions ---
function isActivated(state: { fileUploadAt: Date | null; chatFirstAt: Date | null; mcpConnectAt: Date | null }): boolean {
  let count = 0;
  if (state.fileUploadAt) count++;
  if (state.chatFirstAt) count++;
  if (state.mcpConnectAt) count++;
  return count >= 2;
}

// --- Determine next nudge step based on uncompleted actions ---
function getNextAction(state: { fileUploadAt: Date | null; chatFirstAt: Date | null; mcpConnectAt: Date | null }): 'file_upload' | 'chat' | 'mcp_connect' | null {
  if (!state.fileUploadAt) return 'file_upload';
  if (!state.chatFirstAt) return 'chat';
  if (!state.mcpConnectAt) return 'mcp_connect';
  return null;
}

// --- Email templates ---
const EMAIL_TEMPLATES: Record<string, (action: string) => { subject: string; html: string; text: string }> = {
  d0: (action) => {
    const templates: Record<string, { subject: string; body: string; cta: string; ctaUrl: string }> = {
      file_upload: {
        subject: 'Your AI memory is ready — add your first file',
        body: 'Your knowledge base is empty. Drop a file to get started — DriveMem will automatically organize and make it searchable by AI.',
        cta: 'Upload Your First File',
        ctaUrl: `${FRONTEND_URL}/dashboard`,
      },
      chat: {
        subject: 'Ask your knowledge base anything',
        body: 'You\'ve uploaded files — now try asking a question. DriveMem will search your documents and give you an AI-powered answer with citations.',
        cta: 'Try Asking a Question',
        ctaUrl: `${FRONTEND_URL}/chat/new`,
      },
      mcp_connect: {
        subject: 'Connect DriveMem to Cursor/Claude in 30 seconds',
        body: 'Connect your AI tools to DriveMem so they can access your knowledge base. Works with Cursor, Claude, and any MCP-compatible tool.',
        cta: 'Connect Your AI Tools',
        ctaUrl: `${FRONTEND_URL}/developers`,
      },
    };
    const t = templates[action] || templates.file_upload;
    return {
      subject: t.subject,
      html: buildEmailHtml(t.body, t.cta, t.ctaUrl),
      text: `${t.body}\n\n${t.cta}: ${t.ctaUrl}`,
    };
  },
  d1: (action) => EMAIL_TEMPLATES.d0(action),
  d3: (action) => {
    const t = action === 'mcp_connect'
      ? { subject: 'Connect DriveMem to Cursor/Claude in 30 seconds', body: 'Your AI tools are missing context. Connect DriveMem via MCP and give them access to your knowledge.', cta: 'Connect Now', ctaUrl: `${FRONTEND_URL}/developers` }
      : action === 'file_upload'
        ? { subject: 'Your AI memory is still empty', body: 'Upload your first document and let DriveMem turn it into searchable, AI-ready knowledge.', cta: 'Upload a File', ctaUrl: `${FRONTEND_URL}/dashboard` }
        : { subject: 'Ask your knowledge base anything', body: 'Your documents are ready. Try asking a question — DriveMem searches your files and cites sources.', cta: 'Ask a Question', ctaUrl: `${FRONTEND_URL}/chat/new` };
    return { subject: t.subject, html: buildEmailHtml(t.body, t.cta, t.ctaUrl), text: `${t.body}\n\n${t.cta}: ${t.ctaUrl}` };
  },
  d7: (action) => {
    const t = action === 'mcp_connect'
      ? { subject: 'Last chance: connect your AI tools to DriveMem', body: 'Your knowledge base is waiting. Connect Cursor, Claude, or any MCP tool in 30 seconds.', cta: 'Connect Now', ctaUrl: `${FRONTEND_URL}/developers` }
      : action === 'file_upload'
        ? { subject: 'Your AI memory is waiting', body: 'Upload one document and see what DriveMem can do. It takes 10 seconds.', cta: 'Upload Now', ctaUrl: `${FRONTEND_URL}/dashboard` }
        : { subject: 'Your knowledge base has answers', body: 'You have documents ready. Ask any question and get an AI answer with source citations.', cta: 'Try It Now', ctaUrl: `${FRONTEND_URL}/chat/new` };
    return { subject: t.subject, html: buildEmailHtml(t.body, t.cta, t.ctaUrl), text: `${t.body}\n\n${t.cta}: ${t.ctaUrl}` };
  },
};

function buildEmailHtml(body: string, cta: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a;">
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${body}</p>
<a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${cta}</a>
<p style="margin-top:40px;font-size:12px;color:#999;">
You're receiving this because you signed up for DriveMem.<br>
<a href="{{unsubscribe_url}}" style="color:#999;">Unsubscribe from these emails</a>
</p>
</body></html>`;
}

// --- Ensure nudge state exists for user ---
export async function ensureNudgeState(userId: string): Promise<void> {
  const [existing] = await db.select({ id: schema.nudgeState.id })
    .from(schema.nudgeState)
    .where(eq(schema.nudgeState.userId, userId))
    .limit(1);

  if (!existing) {
    const token = crypto.randomBytes(32).toString('hex');
    await db.insert(schema.nudgeState).values({
      userId,
      unsubscribeToken: token,
    }).onConflictDoNothing();
  }
}

// --- Record activation actions ---
export async function recordActivationAction(userId: string, action: 'file_upload' | 'chat_first' | 'mcp_connect'): Promise<void> {
  await ensureNudgeState(userId);

  const fieldMap = {
    file_upload: schema.nudgeState.fileUploadAt,
    chat_first: schema.nudgeState.chatFirstAt,
    mcp_connect: schema.nudgeState.mcpConnectAt,
  };

  const field = fieldMap[action];
  // Only set if not already set
  await db.update(schema.nudgeState)
    .set({ [field.name]: sql`COALESCE(${field}, now())`, updatedAt: new Date() })
    .where(eq(schema.nudgeState.userId, userId));

  // Check activation
  const [state] = await db.select({
    fileUploadAt: schema.nudgeState.fileUploadAt,
    chatFirstAt: schema.nudgeState.chatFirstAt,
    mcpConnectAt: schema.nudgeState.mcpConnectAt,
    activatedAt: schema.nudgeState.activatedAt,
  }).from(schema.nudgeState).where(eq(schema.nudgeState.userId, userId));

  if (state && !state.activatedAt && isActivated(state)) {
    await db.update(schema.nudgeState)
      .set({ activatedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.nudgeState.userId, userId));
    console.log(`[nudge] User ${userId} activated!`);
    trackServerEvent('activation_complete', { userId });
  }
}

// --- Get activation status for API ---
export async function getActivationStatus(userId: string) {
  await ensureNudgeState(userId);
  const [state] = await db.select().from(schema.nudgeState).where(eq(schema.nudgeState.userId, userId));
  if (!state) return null;

  const completedActions = [];
  if (state.fileUploadAt) completedActions.push('file_upload');
  if (state.chatFirstAt) completedActions.push('chat_first');
  if (state.mcpConnectAt) completedActions.push('mcp_connect');

  return {
    activated: !!state.activatedAt,
    completedActions,
    nextAction: getNextAction(state),
    completedCount: completedActions.length,
    totalRequired: 2,
  };
}

// --- Nudge scheduler (run hourly) ---
export async function runNudgeScheduler(): Promise<{ processed: number; sent: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const today = new Date().toISOString().slice(0, 10);

  // Get all users registered within 7 days who are NOT activated
  const eligibleUsers = await db.select({
    userId: schema.users.id,
    email: schema.users.email,
    createdAt: schema.users.createdAt,
  })
    .from(schema.users)
    .where(gte(schema.users.createdAt, sevenDaysAgo));

  let processed = 0;
  let sent = 0;

  for (const user of eligibleUsers) {
    await ensureNudgeState(user.userId);

    const [state] = await db.select().from(schema.nudgeState)
      .where(eq(schema.nudgeState.userId, user.userId));

    if (!state || state.activatedAt) continue;

    processed++;

    const hoursSinceRegistration = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
    const nextAction = getNextAction(state);
    if (!nextAction) continue;

    // Determine which nudge to send
    let nudgeStep: 'd0' | 'd1' | 'd3' | 'd7' | null = null;
    let nudgeSentField: string | null = null;

    if (hoursSinceRegistration >= 1 && !state.nudgeD0SentAt) {
      nudgeStep = 'd0';
      nudgeSentField = 'nudgeD0SentAt';
    } else if (hoursSinceRegistration >= 24 && !state.nudgeD1SentAt) {
      nudgeStep = 'd1';
      nudgeSentField = 'nudgeD1SentAt';
    } else if (hoursSinceRegistration >= 72 && !state.nudgeD3SentAt) {
      nudgeStep = 'd3';
      nudgeSentField = 'nudgeD3SentAt';
    } else if (hoursSinceRegistration >= 168 && !state.nudgeD7SentAt) {
      nudgeStep = 'd7';
      nudgeSentField = 'nudgeD7SentAt';
    }

    if (!nudgeStep || !nudgeSentField) continue;

    const actionForEmail = nextAction;

    // Send email (if not unsubscribed and not already sent today)
    if (!state.unsubscribedEmail && state.lastEmailSentDate !== today) {
      try {
        const template = EMAIL_TEMPLATES[nudgeStep](actionForEmail);
        const unsubscribeUrl = `${API_URL}/api/v1/unsubscribe?token=${state.unsubscribeToken}`;
        const html = template.html.replace('{{unsubscribe_url}}', unsubscribeUrl);
        const text = template.text + `\n\nUnsubscribe: ${unsubscribeUrl}`;

        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: template.subject,
          html,
          text,
        });

        await db.update(schema.nudgeState).set({
          [nudgeSentField]: new Date(),
          lastEmailSentDate: today,
          updatedAt: new Date(),
        }).where(eq(schema.nudgeState.userId, user.userId));

        console.log(`[nudge] Sent ${nudgeStep} email to ${user.email} (action: ${actionForEmail})`);
        trackServerEvent('nudge_sent', { channel: 'email', step: nudgeStep, action: actionForEmail });
        sent++;
      } catch (err) {
        console.error(`[nudge] Failed to send email to ${user.email}:`, err);
      }
    }

    // Send in-app notification (if not already sent today)
    if (state.lastNotificationSentDate !== today) {
      const notifMessages: Record<string, { title: string; message: string }> = {
        file_upload: { title: 'Upload your first file', message: 'Drop a file to start building your AI knowledge base.' },
        chat: { title: 'Try asking a question', message: 'Your knowledge base is ready — ask anything and get AI-powered answers.' },
        mcp_connect: { title: 'Connect your AI tools', message: 'Connect Cursor, Claude, or any MCP tool to access your knowledge.' },
      };
      const notif = notifMessages[actionForEmail] || notifMessages.file_upload;
      await createNotificationDeduped({
        userId: user.userId,
        type: 'activation_nudge',
        title: notif.title,
        message: notif.message,
      });
      await db.update(schema.nudgeState).set({
        lastNotificationSentDate: today,
        updatedAt: new Date(),
      }).where(eq(schema.nudgeState.userId, user.userId));
      trackServerEvent('nudge_sent', { channel: 'notification', step: nudgeStep, action: actionForEmail });
    }
  }

  console.log(`[nudge] Scheduler complete: ${processed} processed, ${sent} emails sent`);
  return { processed, sent };
}

// --- Unsubscribe ---
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const result = await db.update(schema.nudgeState)
    .set({ unsubscribedEmail: true, updatedAt: new Date() })
    .where(eq(schema.nudgeState.unsubscribeToken, token))
    .returning({ id: schema.nudgeState.id });

  return result.length > 0;
}
