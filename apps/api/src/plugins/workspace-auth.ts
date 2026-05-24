import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import { workspaceMembers } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

const ROLE_HIERARCHY = ['viewer', 'member', 'admin', 'owner'] as const;

export function requireWorkspaceRole(minRole: 'viewer' | 'member' | 'admin' | 'owner') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const workspaceId = (request.params as any).workspaceId || (request.params as any).id;
    if (!workspaceId) return reply.status(400).send({ error: 'workspace_id required' });

    const [membership] = await db.select().from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)));

    if (!membership) return reply.status(403).send({ error: 'not a workspace member' });

    const userLevel = ROLE_HIERARCHY.indexOf(membership.role as any);
    const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);
    if (userLevel < requiredLevel) return reply.status(403).send({ error: 'insufficient permissions' });
  };
}
