import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp, createTestUser, cleanupTestData, authHeaders, TestUser } from './helpers/setup.js';

describe('Workspace CRUD', () => {
  let app: FastifyInstance;
  let user1: TestUser;
  let user2: TestUser;
  const workspaceIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    user1 = await createTestUser();
    user2 = await createTestUser();
    userIds.push(user1.id, user2.id);
  });

  afterAll(async () => {
    await cleanupTestData({ workspaceIds, userIds });
    await app.close();
  });

  it('POST /api/workspaces — 创建成功 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: authHeaders(user1.token),
      payload: { name: 'Test Workspace' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Test Workspace');
    workspaceIds.push(body.id);
  });

  it('POST /api/workspaces — 缺 name 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: authHeaders(user1.token),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/workspaces — 返回用户的 workspaces', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
      headers: authHeaders(user1.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/workspaces/:id — 详情', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceIds[0]}`,
      headers: authHeaders(user1.token),
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/workspaces/:id — 非成员 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceIds[0]}`,
      headers: authHeaders(user2.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('PATCH /api/workspaces/:id — 更新名称', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/${workspaceIds[0]}`,
      headers: authHeaders(user1.token),
      payload: { name: 'Updated Workspace' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Updated Workspace');
  });

  it('PATCH /api/workspaces/:id — 非 admin 403', async () => {
    // user2 is not a member, so should be forbidden
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/${workspaceIds[0]}`,
      headers: authHeaders(user2.token),
      payload: { name: 'Hacked' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('DELETE /api/workspaces/:id — 非 owner 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/workspaces/${workspaceIds[0]}`,
      headers: authHeaders(user2.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('DELETE /api/workspaces/:id — owner 可删', async () => {
    // Create a throwaway workspace to delete
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: authHeaders(user1.token),
      payload: { name: 'To Delete' },
    });
    const wsId = createRes.json().id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/workspaces/${wsId}`,
      headers: authHeaders(user1.token),
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/workspaces — 空列表返回 []', async () => {
    // user2 has no workspaces
    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
      headers: authHeaders(user2.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('POST /api/workspaces — 第二个 workspace', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: authHeaders(user1.token),
      payload: { name: 'Second WS' },
    });
    expect(res.statusCode).toBe(201);
    workspaceIds.push(res.json().id);
  });
});
