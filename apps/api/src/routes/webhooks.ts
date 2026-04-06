import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function webhookRoutes(fastify: FastifyInstance) {
  // GET / — list webhooks
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const hooks = await db.select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.userId, request.user!.id))
      .orderBy(desc(schema.webhooks.createdAt));
    return reply.send({ webhooks: hooks });
  });

  // POST / — create webhook
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { url: string; events: string[] };
    if (!body.url || !body.events?.length) {
      return reply.status(400).send({ error: 'url and events are required' });
    }

    const validEvents = ['file.indexed', 'file.uploaded', 'insight.generated', 'summary.generated'];
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

  // DELETE /:id — delete webhook
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, request.user!.id)));
    return reply.status(204).send();
  });
}
