import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workspaces, workspaceMembers } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { requireWorkspaceRole } from '../plugins/workspace-auth.js';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
});

export default async function workspacesRoutes(app: FastifyInstance) {
  // Create workspace
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const body = createSchema.parse(request.body);

    const [workspace] = await db.insert(workspaces).values({
      name: body.name,
      slug: body.slug,
      ownerId: user.id,
    }).returning();

    // Auto-add creator as owner member
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
      joinedAt: new Date(),
    });

    return reply.status(201).send(workspace);
  });

  // List workspaces for current user
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;

    const results = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        ownerId: workspaces.ownerId,
        role: workspaceMembers.role,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, user.id));

    return results;
  });

  // Get workspace by id
  app.get('/:id', { preHandler: [requireAuth, requireWorkspaceRole('viewer')] }, async (request) => {
    const { id } = request.params as { id: string };
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    if (!workspace) return { error: 'not found' };
    return workspace;
  });

  // Update workspace
  app.patch('/:id', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);

    const [updated] = await db.update(workspaces)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();

    return updated;
  });

  // Delete workspace
  app.delete('/:id', { preHandler: [requireAuth, requireWorkspaceRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(workspaces).where(eq(workspaces.id, id));
    return reply.status(204).send();
  });
}
