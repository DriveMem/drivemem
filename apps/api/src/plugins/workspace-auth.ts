import { FastifyRequest, FastifyReply } from 'fastify';
<<<<<<< HEAD
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
=======
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workspaceMembers } from '../db/schema.js';

type WorkspaceRole = 'viewer' | 'member' | 'admin' | 'owner';

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const params = request.params as Record<string, string>;
    const workspaceId = params.workspaceId || params.id;
    if (!workspaceId) {
      return reply.code(400).send({ error: 'Missing workspace id' });
    }

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, user.id),
        ),
      );

    if (!membership) {
      return reply.code(403).send({ error: 'Not a member of this workspace' });
    }

    const userLevel = ROLE_HIERARCHY[membership.role as WorkspaceRole] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      return reply.code(403).send({ error: 'Insufficient workspace permissions' });
    }

    // Attach membership info for downstream use
    (request as any).workspaceMembership = membership;
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
  };
}
