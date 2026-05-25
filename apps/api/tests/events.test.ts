import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp, createTestUser, cleanupTestData, authHeaders, TestUser } from './helpers/setup.js';

describe('Events', () => {
  let app: FastifyInstance;
  let user: TestUser;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    user = await createTestUser({ name: 'Events User' });
    userIds.push(user.id);
  });

  afterAll(async () => {
    await cleanupTestData({ userIds });
    await app.close();
  });

  it('POST /api/events — 正常记录 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: authHeaders(user.token),
      payload: { event: 'page_view', data: { page: '/dashboard' } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('POST /api/events — 缺 event 字段 → 仍返回 200（fire-and-forget）', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: authHeaders(user.token),
      payload: { data: { something: true } },
    });
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/events — 未认证 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: { 'content-type': 'application/json' },
      payload: { event: 'test' },
    });
    expect(res.statusCode).toBe(401);
  });
});
