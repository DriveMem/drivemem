import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workspaceMembers, users } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { requireWorkspaceRole } from '../plugins/workspace-auth.js';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'member', 'admin']).default('member'),
});

const updateRoleSchema = z.object({
<<<<<<< HEAD
  role: z.enum(['viewer', 'member', 'admin', 'owner']),
});

export default async function workspaceMembersRoutes(app: FastifyInstance) {
  // List members
  app.get('/:workspaceId/members', { preHandler: [requireAuth, requireWorkspaceRole('viewer')] }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
=======
  role: z.enum(['viewer', 'member', 'admin']),
});

export default async function workspaceMemberRoutes(app: FastifyInstance) {
  // GET /workspaces/:id/members
  app.get('/:id/members', { preHandler: [requireAuth, requireWorkspaceRole('viewer')] }, async (request) => {
    const { id } = request.params as { id: string };
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))

    const members = await db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        invitedAt: workspaceMembers.invitedAt,
        joinedAt: workspaceMembers.joinedAt,
        email: users.email,
        name: users.name,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
<<<<<<< HEAD
      .where(eq(workspaceMembers.workspaceId, workspaceId));
=======
      .where(eq(workspaceMembers.workspaceId, id));
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))

    return members;
  });

<<<<<<< HEAD
  // Invite member
  app.post('/:workspaceId/members', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const body = inviteSchema.parse(request.body);

    const [targetUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email));
    if (!targetUser) return reply.status(404).send({ error: 'user not found' });

    // Check not already member
    const [existing] = await db.select().from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUser.id)));
    if (existing) return reply.status(409).send({ error: 'already a member' });

    const [member] = await db.insert(workspaceMembers).values({
      workspaceId,
      userId: targetUser.id,
      role: body.role,
    }).returning();

    return reply.status(201).send(member);
  });

  // Change role
  app.patch('/:workspaceId/members/:uid', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request, reply) => {
    const { workspaceId, uid } = request.params as { workspaceId: string; uid: string };
    const body = updateRoleSchema.parse(request.body);

    const [updated] = await db.update(workspaceMembers)
      .set({ role: body.role })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, uid)))
      .returning();

    if (!updated) return reply.status(404).send({ error: 'member not found' });
    return updated;
  });

  // Remove member
  app.delete('/:workspaceId/members/:uid', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request, reply) => {
    const { workspaceId, uid } = request.params as { workspaceId: string; uid: string };

    await db.delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, uid)));

    return reply.status(204).send();
=======
  // POST /workspaces/:id/members — invite member
  app.post('/:id/members', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = inviteSchema.parse(request.body);

    // Find user by email
    const [targetUser] = await db.select().from(users).where(eq(users.email, body.email));
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, targetUser.id)));

    if (existing) {
      return reply.code(409).send({ error: 'User is already a member' });
    }

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId: id,
        userId: targetUser.id,
        role: body.role,
        joinedAt: new Date(),
      })
      .returning();

    return reply.code(201).send(member);
  });

  // PATCH /workspaces/:id/members/:uid — update role
  app.patch('/:id/members/:uid', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request, reply) => {
    const { id, uid } = request.params as { id: string; uid: string };
    const body = updateRoleSchema.parse(request.body);

    // Cannot change owner's role
    const [target] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, uid)));

    if (!target) return reply.code(404).send({ error: 'Member not found' });
    if (target.role === 'owner') return reply.code(403).send({ error: 'Cannot change owner role' });

    const [updated] = await db
      .update(workspaceMembers)
      .set({ role: body.role })
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, uid)))
      .returning();

    return updated;
  });

  // DELETE /workspaces/:id/members/:uid — remove member
  app.delete('/:id/members/:uid', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request, reply) => {
    const { id, uid } = request.params as { id: string; uid: string };

    // Cannot remove owner
    const [target] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, uid)));

    if (!target) return reply.code(404).send({ error: 'Member not found' });
    if (target.role === 'owner') return reply.code(403).send({ error: 'Cannot remove workspace owner' });

    await db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, uid)));

    return reply.code(204).send();
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
  });
}
