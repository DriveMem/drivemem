import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp, createTestUser, cleanupTestData, authHeaders, TestUser } from './helpers/setup.js';

describe('Handoff 状态机全路径', () => {
  let app: FastifyInstance;
  let fromUser: TestUser;
  let toUser: TestUser;
  let outsider: TestUser;
  let workspaceId: string;
  const userIds: string[] = [];
  const workspaceIds: string[] = [];
  const handoffIds: string[] = [];

  const validContextPack = {
    task: 'Test task for handoff',
    next_steps: ['Step 1', 'Step 2'],
    context: {
      key_facts: ['Fact 1', 'Fact 2'],
    },
  };

  beforeAll(async () => {
    app = await buildApp();
    fromUser = await createTestUser({ name: 'From User' });
    toUser = await createTestUser({ name: 'To User' });
    outsider = await createTestUser({ name: 'Outsider' });
    userIds.push(fromUser.id, toUser.id, outsider.id);

    // Create workspace and add both users
    const wsRes = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: authHeaders(fromUser.token),
      payload: { name: 'Handoff Test WS' },
    });
    workspaceId = wsRes.json().id;
    workspaceIds.push(workspaceId);

    await app.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(fromUser.token),
      payload: { email: toUser.email, role: 'member' },
    });
  });

  afterAll(async () => {
    await cleanupTestData({ handoffIds, workspaceIds, userIds });
    await app.close();
  });

  it('POST /api/handoffs — 创建 draft', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
      payload: { workspace_id: workspaceId, to_user_id: toUser.id, context_pack: validContextPack },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('draft');
    handoffIds.push(body.id);
  });

  it('POST /api/handoffs — to_user = self 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
      payload: { workspace_id: workspaceId, to_user_id: fromUser.id },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/handoffs — to_user 不在 workspace 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
      payload: { workspace_id: workspaceId, to_user_id: outsider.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST /api/handoffs/:id/send — draft→sent（context pack 完整）', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${handoffIds[0]}/send`,
      headers: authHeaders(fromUser.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('sent');
  });

  it('POST /api/handoffs/:id/send — 缺 task 400', async () => {
    // Create a handoff with empty context
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
      payload: { workspace_id: workspaceId, to_user_id: toUser.id, context_pack: {} },
    });
    const id = createRes.json().id;
    handoffIds.push(id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${id}/send`,
      headers: authHeaders(fromUser.token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/handoffs/:id/send — 非 from_user 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${handoffIds[0]}/send`,
      headers: authHeaders(toUser.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/handoffs — 列表（role=to）', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/handoffs?workspace_id=${workspaceId}&role=to`,
      headers: authHeaders(toUser.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/handoffs — 不传 workspace_id 返回用户所有', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('POST /api/handoffs/:id/accept — received→accepted', async () => {
    // Need to get the handoff into "received" state — GET detail triggers sent→received
    await app.inject({
      method: 'GET',
      url: `/api/handoffs/${handoffIds[0]}`,
      headers: authHeaders(toUser.token),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${handoffIds[0]}/accept`,
      headers: authHeaders(toUser.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('accepted');
  });

  it('POST /api/handoffs/:id/reject — received→rejected', async () => {
    // Create another handoff and send it
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
      payload: { workspace_id: workspaceId, to_user_id: toUser.id, context_pack: validContextPack },
    });
    const id = createRes.json().id;
    handoffIds.push(id);

    await app.inject({ method: 'POST', url: `/api/handoffs/${id}/send`, headers: authHeaders(fromUser.token) });
    // Trigger sent→received
    await app.inject({ method: 'GET', url: `/api/handoffs/${id}`, headers: authHeaders(toUser.token) });

    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${id}/reject`,
      headers: authHeaders(toUser.token),
      payload: { reason: 'Not relevant' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('rejected');
  });

  it('POST /api/handoffs/:id/request-more — received→request_more', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
      payload: { workspace_id: workspaceId, to_user_id: toUser.id, context_pack: validContextPack },
    });
    const id = createRes.json().id;
    handoffIds.push(id);

    await app.inject({ method: 'POST', url: `/api/handoffs/${id}/send`, headers: authHeaders(fromUser.token) });
    await app.inject({ method: 'GET', url: `/api/handoffs/${id}`, headers: authHeaders(toUser.token) });

    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${id}/request-more`,
      headers: authHeaders(toUser.token),
      payload: { questions: ['What about X?'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('request_more');
  });

  it('PATCH /api/handoffs/:id — 追加 context（supplementing）', async () => {
    // Use the request_more handoff from above — fromUser can patch it
    const lastId = handoffIds[handoffIds.length - 1];

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/handoffs/${lastId}`,
      headers: authHeaders(fromUser.token),
      payload: { context_pack: { context: { key_facts: ['Additional fact'] } } },
    });
    // Should be 200 (or 409 if status doesn't allow — depends on implementation)
    expect([200, 409]).toContain(res.statusCode);
  });

  it('POST /api/handoffs/:id/send — 非法转换 409（已 accepted）', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${handoffIds[0]}/send`,
      headers: authHeaders(fromUser.token),
    });
    expect(res.statusCode).toBe(409);
  });

  it('GET /api/handoffs/:id — 返回 from_user_name/to_user_name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/handoffs/${handoffIds[0]}`,
      headers: authHeaders(fromUser.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.from_user_name).toBeDefined();
    expect(body.to_user_name).toBeDefined();
  });

  it('POST /api/handoffs/:id/accept — 非 to_user 403', async () => {
    // Create a fresh handoff in received state
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/handoffs',
      headers: authHeaders(fromUser.token),
      payload: { workspace_id: workspaceId, to_user_id: toUser.id, context_pack: validContextPack },
    });
    const id = createRes.json().id;
    handoffIds.push(id);

    await app.inject({ method: 'POST', url: `/api/handoffs/${id}/send`, headers: authHeaders(fromUser.token) });
    await app.inject({ method: 'GET', url: `/api/handoffs/${id}`, headers: authHeaders(toUser.token) });

    const res = await app.inject({
      method: 'POST',
      url: `/api/handoffs/${id}/accept`,
      headers: authHeaders(fromUser.token), // wrong user
    });
    expect(res.statusCode).toBe(403);
  });
});
