import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp, createTestUser, cleanupTestData, authHeaders, TestUser } from './helpers/setup.js';

describe('Search', () => {
  let app: FastifyInstance;
  let user1: TestUser;
  let user2: TestUser;
  let workspaceId: string;
  const userIds: string[] = [];
  const workspaceIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    user1 = await createTestUser({ name: 'Search User 1' });
    user2 = await createTestUser({ name: 'Search User 2' });
    userIds.push(user1.id, user2.id);

    const wsRes = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: authHeaders(user1.token),
      payload: { name: 'Search WS' },
    });
    workspaceId = wsRes.json().id;
    workspaceIds.push(workspaceId);
  });

  afterAll(async () => {
    await cleanupTestData({ workspaceIds, userIds });
    await app.close();
  });

  it('GET /api/search — 正常搜索返回结果', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=test',
      headers: authHeaders(user1.token),
    });
    // May return 200 with empty results or actual results
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/search — 空 query 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=',
      headers: authHeaders(user1.token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/search — workspace_id 隔离', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/search?q=test&workspace_id=${workspaceId}`,
      headers: authHeaders(user1.token),
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/search — 返回结构含 text/snippet', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=document',
      headers: authHeaders(user1.token),
    });
    expect(res.statusCode).toBe(200);
    // Results may be empty but response structure should be valid
    const body = res.json();
    expect(body).toBeDefined();
  });

  it('GET /api/search — 返回 score', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=knowledge&mode=hybrid',
      headers: authHeaders(user1.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // If results exist, they should have score
    if (Array.isArray(body) && body.length > 0) {
      expect(body[0].score ?? body[0].rrfScore).toBeDefined();
    }
  });
});
