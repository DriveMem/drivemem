import { createHash } from 'crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { FastifyRequest, FastifyReply } from 'fastify';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  // Allow session-authenticated requests (cookie/JWT already resolved by auth plugin)
  if (request.user) return;

  const auth = request.headers.authorization;
  const queryKey = (request.query as any)?.apiKey;
  
  let rawKey: string;
  if (auth?.startsWith('Bearer ak_')) {
    rawKey = auth.replace('Bearer ', '');
  } else if (queryKey?.startsWith('ak_')) {
    rawKey = queryKey;
  } else {
    return reply.status(401).send({ error: 'API Key required. Use Authorization: Bearer ak_xxxxx or ?apiKey=ak_xxxxx' });
  }
  const keyHash = hashKey(rawKey);

  const [apiKey] = await db.select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, keyHash));

  if (!apiKey) {
    return reply.status(401).send({ error: 'Invalid API Key' });
  }

  // Update last used
  await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, apiKey.id));

  // Set user on request
  const [user] = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, apiKey.userId));

  if (!user) return reply.status(401).send({ error: 'User not found' });

  request.user = { id: user.id, email: user.email, name: user.name || '' };
  (request as any).apiKeyScopes = apiKey.scopes || ['read', 'write'];
  (request as any).apiKeyId = apiKey.id;
  (request as any).apiKeyName = apiKey.name || '';
}

/** Middleware: require specific scope on current API Key */
export function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const scopes: string[] = (request as any).apiKeyScopes;
    // Session auth (not API key) has full access
    if (!scopes) return;
    if (!scopes.includes(scope) && !scopes.includes('admin')) {
      return reply.status(403).send({ error: `Insufficient permissions. Required scope: ${scope}` });
    }
  };
}
