import { FastifyInstance } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const keys = await db.select({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      keyPrefix: schema.apiKeys.keyPrefix,
      scopes: schema.apiKeys.scopes,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      createdAt: schema.apiKeys.createdAt,
    })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, request.user!.id))
      .orderBy(desc(schema.apiKeys.createdAt));
    return reply.send({ keys });
  });

  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { name: string; scopes?: string[] };
    if (!body.name) return reply.status(400).send({ error: 'name is required' });

    const validScopes = ['read', 'write', 'admin'];
    const scopes = body.scopes?.filter(s => validScopes.includes(s)) || ['read', 'write'];

    const rawKey = 'ak_' + randomBytes(24).toString('hex');
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 11);

    await db.insert(schema.apiKeys).values({
      userId: request.user!.id,
      name: body.name,
      keyHash,
      keyPrefix,
      scopes,
    });

    return reply.status(201).send({ key: rawKey, prefix: keyPrefix, name: body.name, scopes });
  });

  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(schema.apiKeys)
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.userId, request.user!.id)));
    return reply.status(204).send();
  });
}
