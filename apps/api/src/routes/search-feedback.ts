import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { searchFeedback } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';

export default async function searchFeedbackRoutes(app: FastifyInstance) {
  app.post('/feedback', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { query: string; fileId: string; signal: string };

    if (!body.query || !body.fileId || !['click', 'thumbs_up', 'thumbs_down'].includes(body.signal)) {
      return reply.status(400).send({ error: 'query, fileId, and signal (click|thumbs_up|thumbs_down) are required' });
    }

    await db.insert(searchFeedback).values({
      userId,
      query: body.query,
      fileId: body.fileId,
      signal: body.signal,
    });

    return reply.send({ success: true });
  });
}
