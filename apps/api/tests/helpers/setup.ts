import Fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';

// We build a real app instance by importing the same plugins/routes as index.ts
// but without calling listen().
let _secret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (!_secret) {
    const jwtSecret = process.env.JWT_SECRET || 'test-secret-for-testing-only';
    _secret = new TextEncoder().encode(jwtSecret);
  }
  return _secret;
}

/**
 * Build a Fastify app instance suitable for inject() testing.
 * This imports and registers the same plugins/routes as the production app.
 */
export async function buildApp(): Promise<FastifyInstance> {
  // Set test env defaults
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-for-testing-only';
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

  const app = Fastify({ logger: false });

  // Register core plugins
  const cors = (await import('@fastify/cors')).default;
  const sensible = (await import('@fastify/sensible')).default;
  await app.register(cors, { origin: true, credentials: true });
  await app.register(sensible);

  // Auth plugin
  const authPlugin = (await import('../../src/plugins/auth.js')).default;
  await app.register(authPlugin);

  // Error handler
  const errorHandler = (await import('../../src/plugins/error-handler.js')).default;
  await app.register(errorHandler);

  // Demo guard
  const demoGuard = (await import('../../src/plugins/demo-guard.js')).default;
  await app.register(demoGuard);

  // Routes under test
  const workspaceRoutes = (await import('../../src/routes/workspaces.js')).default;
  const workspaceMemberRoutes = (await import('../../src/routes/workspace-members.js')).default;
  const handoffRoutes = (await import('../../src/routes/handoffs.js')).default;
  const searchRoutes = (await import('../../src/routes/search.js')).default;

  await app.register(workspaceRoutes, { prefix: '/api/workspaces' });
  await app.register(workspaceMemberRoutes, { prefix: '/api/workspaces' });
  await app.register(handoffRoutes, { prefix: '/api/handoffs' });
  await app.register(searchRoutes, { prefix: '/api/search' });

  // Events route (fire-and-forget analytics endpoint)
  app.post('/api/events', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    // Fire-and-forget: always return success
    return reply.code(200).send({ ok: true });
  });

  // Health
  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.ready();
  return app;
}

/** Test prefix to identify test data for cleanup */
export const TEST_PREFIX = `test_${randomUUID().slice(0, 8)}`;

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

/**
 * Create a test user directly in DB and return user info + JWT token.
 */
export async function createTestUser(overrides?: { email?: string; name?: string }): Promise<TestUser> {
  const { db } = await import('../../src/db/index.js');
  const { users } = await import('../../src/db/schema.js');

  const id = randomUUID();
  const email = overrides?.email || `${TEST_PREFIX}_${randomUUID().slice(0, 6)}@test.local`;
  const name = overrides?.name || `Test User ${id.slice(0, 6)}`;

  await db.insert(users).values({
    id,
    email,
    name,
    passwordHash: 'not-a-real-hash',
    authProvider: 'credentials',
  });

  const token = await createToken({ id, email, name });
  return { id, email, name, token };
}

/**
 * Create a JWT token for a given user payload.
 */
export async function createToken(user: { id: string; email: string; name: string }): Promise<string> {
  const secret = getSecret();
  const token = await new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);
  return token;
}

/**
 * Cleanup test data created during tests.
 * Pass arrays of IDs to delete.
 */
export async function cleanupTestData(opts: {
  userIds?: string[];
  workspaceIds?: string[];
  handoffIds?: string[];
}) {
  const { db } = await import('../../src/db/index.js');
  const { users, workspaces, handoffs, workspaceMembers } = await import('../../src/db/schema.js');
  const { inArray } = await import('drizzle-orm');

  // Delete in dependency order
  if (opts.handoffIds?.length) {
    await db.delete(handoffs).where(inArray(handoffs.id, opts.handoffIds));
  }
  if (opts.workspaceIds?.length) {
    // Members cascade, but be explicit
    await db.delete(workspaceMembers).where(inArray(workspaceMembers.workspaceId, opts.workspaceIds));
    await db.delete(workspaces).where(inArray(workspaces.id, opts.workspaceIds));
  }
  if (opts.userIds?.length) {
    await db.delete(users).where(inArray(users.id, opts.userIds));
  }
}

/**
 * Helper to make authenticated requests via inject.
 */
export function authHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
}
