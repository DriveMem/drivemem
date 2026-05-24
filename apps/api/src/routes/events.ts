import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';

const eventSchema = z.object({
  event: z.string().max(255),
  properties: z.record(z.any()).default({}),
  timestamp: z.string().optional(),
});

export default async function eventRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const user = request.user!;
      const body = eventSchema.parse(request.body);

      await db.insert(events).values({
        userId: user.id,
        event: body.event,
        properties: body.properties,
      });

      return reply.status(201).send({ ok: true });
    } catch (err) {
      // fire-and-forget semantics: don't let frontend retry
      return reply.status(200).send({ ok: true });
    }
  });
}
