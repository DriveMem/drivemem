import { FastifyRequest, FastifyReply } from 'fastify';
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
  };
}
