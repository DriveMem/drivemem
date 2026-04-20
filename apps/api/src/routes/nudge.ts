/**
 * Activation Nudge Routes
 * - GET /api/v1/unsubscribe?token=xxx — one-click email unsubscribe
 * - GET /api/v1/activation-status — get current activation status
 * - POST /api/v1/activation/dismiss-banner — dismiss activation banner
 */

import { FastifyInstance } from 'fastify';
import { unsubscribeByToken, getActivationStatus, runNudgeScheduler } from '../services/nudge.service.js';

export default async function nudgeRoutes(fastify: FastifyInstance) {
  // POST /cron/nudge-check — external cron trigger (protected by CRON_SECRET)
  fastify.post('/cron/nudge-check', async (request, reply) => {
    const { authorization } = request.headers;
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const result = await runNudgeScheduler();
    return reply.send({ ok: true, ...result });
  });

  // POST /nudge/unsubscribe — authenticated user unsubscribe from nudge emails
  fastify.post('/nudge/unsubscribe', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { db } = await import('../db/index.js');
    const { nudgeState } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');

    const result = await db.update(nudgeState)
      .set({ unsubscribedEmail: true, updatedAt: new Date() })
      .where(eq(nudgeState.userId, userId))
      .returning({ id: nudgeState.id });

    return reply.send({ ok: result.length > 0 });
  });
  // GET /unsubscribe?token=xxx — public, no auth required
  fastify.get('/unsubscribe', async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.status(400).type('text/html').send('<h2>Invalid unsubscribe link</h2>');
    }

    const success = await unsubscribeByToken(token);
    if (success) {
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
        <body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;text-align:center;">
          <h2>✅ You've been unsubscribed</h2>
          <p style="color:#666;">You won't receive any more activation emails from DriveMem.</p>
          <p style="color:#666;font-size:14px;">You'll still see in-app notifications, which you can manage in Settings.</p>
        </body></html>
      `);
    } else {
      return reply.status(404).type('text/html').send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Not Found</title></head>
        <body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;text-align:center;">
          <h2>Link not found</h2>
          <p style="color:#666;">This unsubscribe link may have expired or already been used.</p>
        </body></html>
      `);
    }
  });

  // GET /activation-status — requires auth
  fastify.get('/activation-status', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const status = await getActivationStatus(userId);
    return reply.send(status || { activated: false, completedActions: [], nextAction: 'file_upload', completedCount: 0, totalRequired: 2 });
  });
}
