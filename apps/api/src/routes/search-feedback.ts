import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { searchFeedback } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';

const validSignals = ['click', 'thumbs_up', 'thumbs_down', 'dwell', 'copy', 'reformulation'];

export default async function searchFeedbackRoutes(app: FastifyInstance) {
  app.post('/feedback', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { query: string; fileId?: string; signal: string; metadata?: Record<string, any> };

    if (!body.query || !body.signal || !validSignals.includes(body.signal)) {
      return reply.status(400).send({ error: `query and signal (${validSignals.join('|')}) are required` });
    }

    // fileId is required for all signals except reformulation
    if (body.signal !== 'reformulation' && !body.fileId) {
      return reply.status(400).send({ error: 'fileId is required for this signal type' });
    }

    await db.insert(searchFeedback).values({
      userId,
      query: body.query,
      fileId: body.fileId || null,
      signal: body.signal,
      metadata: body.metadata || null,
    });

    return reply.send({ success: true });
  });
}
