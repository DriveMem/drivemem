import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';
import { requireApiKey } from '../plugins/api-key-auth.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Accept either session auth or API Key
async function requireAnyAuth(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (auth?.startsWith('Bearer ak_')) {
    return requireApiKey(request, reply);
  }
  return requireAuth(request, reply);
}

export default async function webhookRoutes(fastify: FastifyInstance) {
  // GET / — list webhooks
  fastify.get('/', { preHandler: [requireAnyAuth] }, async (request, reply) => {
    const hooks = await db.select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.userId, request.user!.id))
      .orderBy(desc(schema.webhooks.createdAt));
    return reply.send({ webhooks: hooks });
  });

  // POST / — create webhook
  fastify.post('/', { preHandler: [requireAnyAuth] }, async (request, reply) => {
    const body = request.body as { url: string; events: string[] };
    if (!body.url || !body.events?.length) {
      return reply.status(400).send({ error: 'url and events are required' });
    }

    const validEvents = ['file.indexed', 'file.deleted', 'insight.discovered', 'summary.generated'];
    const events = body.events.filter(e => validEvents.includes(e));
    if (events.length === 0) {
      return reply.status(400).send({ error: `Valid events: ${validEvents.join(', ')}` });
    }

    const secret = randomBytes(32).toString('hex');

    const [hook] = await db.insert(schema.webhooks).values({
      userId: request.user!.id,
      url: body.url,
      events,
      secret,
    }).returning();

    return reply.status(201).send({ ...hook, secret });
  });

  // PATCH /:id — update webhook
  fastify.patch('/:id', { preHandler: [requireAnyAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { url?: string; events?: string[]; active?: boolean };
    const updates: Record<string, unknown> = {};

    if (body.url) updates.url = body.url;
    if (body.active !== undefined) updates.active = body.active;
    if (body.events?.length) {
      const validEvents = ['file.indexed', 'file.deleted', 'insight.discovered', 'summary.generated'];
      updates.events = body.events.filter(e => validEvents.includes(e));
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ error: 'Nothing to update' });
    }

    const [updated] = await db.update(schema.webhooks)
      .set(updates)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, request.user!.id)))
      .returning();

    if (!updated) return reply.status(404).send({ error: 'Webhook not found' });
    return reply.send(updated);
  });

  // DELETE /:id — delete webhook
  fastify.delete('/:id', { preHandler: [requireAnyAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, request.user!.id)));
    return reply.status(204).send();
  });

  // POST /:id/test — send test event
  fastify.post('/:id/test', { preHandler: [requireAnyAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [hook] = await db.select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, request.user!.id)));
    if (!hook) return reply.status(404).send({ error: 'Webhook not found' });

    const { dispatchWebhook } = await import('../services/webhook.service.js');
    // Send a test event directly to this webhook
    const body = JSON.stringify({
      event: 'test.ping',
      data: { message: 'This is a test event from AI Drive', webhookId: hook.id },
      timestamp: new Date().toISOString(),
    });
    const { createHmac } = await import('crypto');
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AIDrive-Signature': `sha256=${signature}`,
          'X-AIDrive-Event': 'test.ping',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      return reply.send({ success: res.ok, statusCode: res.status });
    } catch (err) {
      return reply.send({ success: false, error: (err as Error).message });
    }
  });

  // GET /deliveries — recent delivery logs
  fastify.get('/deliveries', { preHandler: [requireAnyAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string; webhookId?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);

    let q = db.select({
      id: schema.webhookDeliveries.id,
      webhookId: schema.webhookDeliveries.webhookId,
      event: schema.webhookDeliveries.event,
      url: schema.webhookDeliveries.url,
      statusCode: schema.webhookDeliveries.statusCode,
      success: schema.webhookDeliveries.success,
      duration: schema.webhookDeliveries.duration,
      error: schema.webhookDeliveries.error,
      createdAt: schema.webhookDeliveries.createdAt,
    })
      .from(schema.webhookDeliveries)
      .where(eq(schema.webhookDeliveries.userId, userId))
      .orderBy(desc(schema.webhookDeliveries.createdAt))
      .limit(limit);

    const deliveries = await q;
    return reply.send({ deliveries });
  });
}
