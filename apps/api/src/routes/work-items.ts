import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export default async function workItemRoutes(fastify: FastifyInstance) {
  // GET /api/users/me/work-items
  fastify.get('/', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const query = request.query as { type?: string; status?: string; folderId?: string };
    const conditions = [eq(schema.workItems.userId, userId)];

    if (query.type) conditions.push(eq(schema.workItems.type, query.type));
    if (query.status) conditions.push(eq(schema.workItems.status, query.status));
    if (query.folderId) conditions.push(eq(schema.workItems.folderId, query.folderId));

    const items = await db.select()
      .from(schema.workItems)
      .where(and(...conditions))
      .orderBy(desc(schema.workItems.createdAt))
      .limit(200);

    // Summary counts
    const allItems = await db.select({
      type: schema.workItems.type,
      status: schema.workItems.status,
    })
      .from(schema.workItems)
      .where(eq(schema.workItems.userId, userId));

    const counts = {
      decision: 0, todo: 0, blocker: 0, milestone: 0, insight: 0,
      active: 0, done: 0, blocked: 0, archived: 0,
    };
    for (const item of allItems) {
      if (item.type in counts) (counts as any)[item.type]++;
      if (item.status in counts) (counts as any)[item.status]++;
    }

    return reply.send({ items, counts });
  });

  // PATCH /api/users/me/work-items/:id
  fastify.patch('/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const body = request.body as { status?: string; title?: string; priority?: string; description?: string };

    const [existing] = await db.select()
      .from(schema.workItems)
      .where(and(eq(schema.workItems.id, id), eq(schema.workItems.userId, userId)));

    if (!existing) return reply.status(404).send({ error: 'Work item not found' });

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.status && ['active', 'done', 'blocked', 'archived'].includes(body.status)) {
      updates.status = body.status;
      if (body.status === 'done') updates.completedAt = new Date();
    }
    if (body.title) updates.title = body.title.slice(0, 255);
    if (body.priority && ['high', 'medium', 'low'].includes(body.priority)) updates.priority = body.priority;
    if (body.description !== undefined) updates.description = body.description;

    const [updated] = await db.update(schema.workItems)
      .set(updates)
      .where(eq(schema.workItems.id, id))
      .returning();

    return reply.send({ item: updated });
  });

  // DELETE /api/users/me/work-items/:id
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const [existing] = await db.select()
      .from(schema.workItems)
      .where(and(eq(schema.workItems.id, id), eq(schema.workItems.userId, userId)));

    if (!existing) return reply.status(404).send({ error: 'Work item not found' });

    await db.delete(schema.workItems).where(eq(schema.workItems.id, id));
    return reply.status(204).send();
  });
}
