import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp, createTestUser, cleanupTestData, authHeaders, TestUser } from './helpers/setup.js';

describe('Members 权限矩阵', () => {
  let app: FastifyInstance;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let workspaceId: string;
  const userIds: string[] = [];
  const workspaceIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    owner = await createTestUser({ name: 'Owner' });
    admin = await createTestUser({ name: 'Admin' });
    member = await createTestUser({ name: 'Member' });
    outsider = await createTestUser({ name: 'Outsider' });
    userIds.push(owner.id, admin.id, member.id, outsider.id);

    // Create workspace
    const res = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: authHeaders(owner.token),
      payload: { name: 'Member Test WS' },
    });
    workspaceId = res.json().id;
    workspaceIds.push(workspaceId);

    // Add admin
    await app.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(owner.token),
      payload: { email: admin.email, role: 'admin' },
    });

    // Add member
    await app.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(owner.token),
      payload: { email: member.email, role: 'member' },
    });
  });

  afterAll(async () => {
    await cleanupTestData({ workspaceIds, userIds });
    await app.close();
  });

  it('POST /workspaces/:id/members — admin 邀请成功', async () => {
    const newUser = await createTestUser({ name: 'Invited' });
    userIds.push(newUser.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(admin.token),
      payload: { email: newUser.email, role: 'member' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('POST /workspaces/:id/members — member 邀请 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(member.token),
      payload: { email: outsider.email, role: 'member' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('PATCH /workspaces/:id/members/:uid — 改角色', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/${workspaceId}/members/${member.id}`,
      headers: authHeaders(owner.token),
      payload: { role: 'admin' },
    });
    expect(res.statusCode).toBe(200);

    // Reset back to member for other tests
    await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/${workspaceId}/members/${member.id}`,
      headers: authHeaders(owner.token),
      payload: { role: 'member' },
    });
  });

  it('PATCH /workspaces/:id/members/:uid — 不能降自己', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/workspaces/${workspaceId}/members/${owner.id}`,
      headers: authHeaders(owner.token),
      payload: { role: 'member' },
    });
    // Should be 400 or 403
    expect([400, 403]).toContain(res.statusCode);
  });

  it('DELETE /workspaces/:id/members/:uid — admin 移除 member', async () => {
    // Create a user to remove
    const toRemove = await createTestUser({ name: 'ToRemove' });
    userIds.push(toRemove.id);
    await app.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(admin.token),
      payload: { email: toRemove.email, role: 'member' },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/workspaces/${workspaceId}/members/${toRemove.id}`,
      headers: authHeaders(admin.token),
    });
    expect(res.statusCode).toBe(200);
  });

  it('DELETE /workspaces/:id/members/:uid — member 移除他人 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/workspaces/${workspaceId}/members/${admin.id}`,
      headers: authHeaders(member.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('DELETE /workspaces/:id/members/:uid — 不能移除 owner', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/workspaces/${workspaceId}/members/${owner.id}`,
      headers: authHeaders(admin.token),
    });
    // Should be 400 or 403
    expect([400, 403]).toContain(res.statusCode);
  });

  it('GET /workspaces/:id/members — 列表', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    expect(res.json().length).toBeGreaterThanOrEqual(3);
  });

  it('GET /workspaces/:id/members — 非成员 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(outsider.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST /workspaces/:id/members — 已存在的用户 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/workspaces/${workspaceId}/members`,
      headers: authHeaders(owner.token),
      payload: { email: member.email, role: 'member' },
    });
    expect(res.statusCode).toBe(409);
  });
});
