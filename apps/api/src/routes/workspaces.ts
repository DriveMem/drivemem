import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workspaces, workspaceMembers } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { requireWorkspaceRole } from '../plugins/workspace-auth.js';

<<<<<<< HEAD
const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
=======
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
<<<<<<< HEAD
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
=======
  slug: z.string().min(1).max(100).optional(),
});

export default async function workspaceRoutes(app: FastifyInstance) {
  // POST / — create workspace
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const body = createSchema.parse(request.body);
    const slug = body.slug || generateSlug(body.name);

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: body.name,
        slug,
        ownerId: user.id,
      })
      .returning();

    // Add creator as owner member
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
      joinedAt: new Date(),
    });

<<<<<<< HEAD
    return reply.status(201).send(workspace);
  });

  // List workspaces for current user
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;

    const results = await db
=======
    return reply.code(201).send(workspace);
  });

  // GET / — list user's workspaces
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;

    const rows = await db
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
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

<<<<<<< HEAD
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
=======
    return rows;
  });

  // GET /:id — workspace detail
  app.get('/:id', { preHandler: [requireAuth, requireWorkspaceRole('viewer')] }, async (request) => {
    const { id } = request.params as { id: string };
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    if (!workspace) return { error: 'Not found' };
    return workspace;
  });

  // PATCH /:id — update workspace
  app.patch('/:id', { preHandler: [requireAuth, requireWorkspaceRole('admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.name) updates.name = body.name;
    if (body.slug) updates.slug = body.slug;

    const [updated] = await db.update(workspaces).set(updates).where(eq(workspaces.id, id)).returning();
    return updated;
  });

  // DELETE /:id — delete workspace (owner only)
  app.delete('/:id', { preHandler: [requireAuth, requireWorkspaceRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(workspaces).where(eq(workspaces.id, id));
    return reply.code(204).send();
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
  });
}
