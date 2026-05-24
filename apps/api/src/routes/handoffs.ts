import { FastifyInstance } from 'fastify';
import { z } from 'zod';
<<<<<<< HEAD
import { eq, and, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { handoffs, users, workspaceMembers } from '../db/schema.js';
=======
import { eq, and, or, sql, aliasedTable } from 'drizzle-orm';
import { db } from '../db/index.js';
import { handoffs, workspaceMembers, users } from '../db/schema.js';
>>>>>>> 2e221bb (fix: align frontend interface with API contract (from_user_name/avatar fields))
import { requireAuth } from '../plugins/auth.js';
import { validateContextPack } from '../services/handoff-validator.js';
import { notifyHandoffRecipient } from '../services/handoff-webhook.js';

const createSchema = z.object({
  workspace_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  context_pack: z.record(z.any()).default({}),
  expires_hours: z.number().default(72),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['received'],
  received: ['accepted', 'rejected', 'request_more'],
  request_more: ['supplementing'],
  supplementing: ['sent'],
};

export default async function handoffsRoutes(app: FastifyInstance) {
  // Create handoff
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const body = createSchema.parse(request.body);

    if (body.to_user_id === user.id) {
      return reply.status(400).send({ error: 'cannot handoff to yourself' });
    }

    // Verify both users are workspace members
    const members = await db.select({ userId: workspaceMembers.userId }).from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, body.workspace_id),
        or(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.userId, body.to_user_id))
      ));
    const memberIds = members.map(m => m.userId);
    if (!memberIds.includes(user.id) || !memberIds.includes(body.to_user_id)) {
      return reply.status(403).send({ error: 'both users must be workspace members' });
    }

    const [handoff] = await db.insert(handoffs).values({
      workspaceId: body.workspace_id,
      fromUserId: user.id,
      toUserId: body.to_user_id,
      contextPack: body.context_pack,
      expiresAt: new Date(Date.now() + body.expires_hours * 60 * 60 * 1000),
    }).returning();

    return reply.status(201).send(handoff);
  });

  // Update context_pack (only draft/supplementing)
  app.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const body = request.body as { context_pack?: any };

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.status(404).send({ error: 'not found' });
    if (handoff.fromUserId !== user.id) return reply.status(403).send({ error: 'not the sender' });
    if (!['draft', 'supplementing'].includes(handoff.status)) {
      return reply.status(409).send({ error: `cannot update in status: ${handoff.status}` });
    }

    const merged = { ...(handoff.contextPack as any), ...body.context_pack };
    const [updated] = await db.update(handoffs)
      .set({ contextPack: merged, updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // Send: draft → sent
  app.post('/:id/send', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.status(404).send({ error: 'not found' });
    if (handoff.fromUserId !== user.id) return reply.status(403).send({ error: 'not the sender' });

    if (!VALID_TRANSITIONS[handoff.status]?.includes('sent')) {
      return reply.status(409).send({ error: `cannot send from status: ${handoff.status}` });
    }

    const validation = validateContextPack(handoff.contextPack);
    if (!validation.valid) {
      return reply.status(400).send({ error: 'context pack incomplete', missing: validation.missing });
    }

    const [updated] = await db.update(handoffs)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    // Notify recipient
    const [recipient] = await db.select({ webhookUrl: users.webhookUrl }).from(users).where(eq(users.id, handoff.toUserId));
    await notifyHandoffRecipient(recipient?.webhookUrl, {
      event: 'handoff.sent',
      handoff_id: updated.id,
      from_user_id: updated.fromUserId,
      to_user_id: updated.toUserId,
      summary: (updated.contextPack as any)?.task || '',
      timestamp: new Date().toISOString(),
    });

    return updated;
  });

  // Accept: received → accepted
  app.post('/:id/accept', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.status(404).send({ error: 'not found' });
    if (handoff.toUserId !== user.id) return reply.status(403).send({ error: 'not the recipient' });

    // Auto-transition sent → received
    if (handoff.status === 'sent') {
      await db.update(handoffs).set({ status: 'received', updatedAt: new Date() }).where(eq(handoffs.id, id));
      handoff.status = 'received';
    }

    if (handoff.status !== 'received') {
      return reply.status(409).send({ error: `cannot accept from status: ${handoff.status}` });
    }

    const [updated] = await db.update(handoffs)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // Reject: received → rejected
  app.post('/:id/reject', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.status(404).send({ error: 'not found' });
    if (handoff.toUserId !== user.id) return reply.status(403).send({ error: 'not the recipient' });

    if (handoff.status === 'sent') {
      await db.update(handoffs).set({ status: 'received', updatedAt: new Date() }).where(eq(handoffs.id, id));
      handoff.status = 'received';
    }

    if (handoff.status !== 'received') {
      return reply.status(409).send({ error: `cannot reject from status: ${handoff.status}` });
    }

    const [updated] = await db.update(handoffs)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // Request more: received → request_more
  app.post('/:id/request-more', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const body = request.body as { questions: string[] };

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.status(404).send({ error: 'not found' });
    if (handoff.toUserId !== user.id) return reply.status(403).send({ error: 'not the recipient' });

    if (handoff.status === 'sent') {
      await db.update(handoffs).set({ status: 'received', updatedAt: new Date() }).where(eq(handoffs.id, id));
      handoff.status = 'received';
    }

    if (handoff.status !== 'received') {
      return reply.status(409).send({ error: `cannot request-more from status: ${handoff.status}` });
    }

    const supplementRequests = [...((handoff.supplementRequests as any[]) || []), { questions: body.questions, at: new Date().toISOString() }];

    const [updated] = await db.update(handoffs)
      .set({ status: 'request_more', supplementRequests, updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // Supplement: supplementing → sent (from_user responds)
  app.post('/:id/supplement', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const body = request.body as { context_pack?: any };

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.status(404).send({ error: 'not found' });
    if (handoff.fromUserId !== user.id) return reply.status(403).send({ error: 'not the sender' });

    if (handoff.status === 'request_more') {
      await db.update(handoffs).set({ status: 'supplementing', updatedAt: new Date() }).where(eq(handoffs.id, id));
      handoff.status = 'supplementing';
    }

    if (handoff.status !== 'supplementing') {
      return reply.status(409).send({ error: `cannot supplement from status: ${handoff.status}` });
    }

    const merged = body.context_pack ? { ...(handoff.contextPack as any), ...body.context_pack } : handoff.contextPack;

    const [updated] = await db.update(handoffs)
      .set({ status: 'sent', contextPack: merged, updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // Get detail
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

<<<<<<< HEAD
    const results = await db
      .select()
      .from(handoffs)
      .where(eq(handoffs.id, id));

    if (!results.length) return reply.status(404).send({ error: 'not found' });

    const h = results[0];
    const [fromUser] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, h.fromUserId));
    const [toUser] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, h.toUserId));

    return { ...h, from_user_name: fromUser?.name, to_user_name: toUser?.name };
=======
    const fromUser = aliasedTable(users, 'from_user');
    const toUser = aliasedTable(users, 'to_user');

    const [row] = await db
      .select({
        handoff: handoffs,
        from_user_name: fromUser.name,
        from_user_avatar: fromUser.avatarUrl,
        to_user_name: toUser.name,
        to_user_avatar: toUser.avatarUrl,
      })
      .from(handoffs)
      .leftJoin(fromUser, eq(handoffs.fromUserId, fromUser.id))
      .leftJoin(toUser, eq(handoffs.toUserId, toUser.id))
      .where(eq(handoffs.id, id));

    if (!row) return reply.code(404).send({ error: 'Not found' });
    const handoff = row.handoff;
    if (handoff.fromUserId !== user.id && handoff.toUserId !== user.id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Auto-transition: sent → received when to_user first GETs
    if (handoff.status === 'sent' && handoff.toUserId === user.id) {
      const [updated] = await db
        .update(handoffs)
        .set({ status: 'received', updatedAt: new Date() })
        .where(eq(handoffs.id, id))
        .returning();
      return {
        ...updated,
        from_user_name: row.from_user_name,
        from_user_avatar: row.from_user_avatar,
        to_user_name: row.to_user_name,
        to_user_avatar: row.to_user_avatar,
      };
    }

    return {
      ...handoff,
      from_user_name: row.from_user_name,
      from_user_avatar: row.from_user_avatar,
      to_user_name: row.to_user_name,
      to_user_avatar: row.to_user_avatar,
    };
  });

  // GET / — list handoffs
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const query = request.query as { workspace_id?: string; status?: string; role?: string };

    const conditions: any[] = [];

    if (query.workspace_id) {
      // Verify user is workspace member
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, query.workspace_id), eq(workspaceMembers.userId, user.id)));
      if (!membership) return reply.code(403).send({ error: 'Not a workspace member' });

      conditions.push(eq(handoffs.workspaceId, query.workspace_id));

      if (query.role === 'from') {
        conditions.push(eq(handoffs.fromUserId, user.id));
      } else if (query.role === 'to') {
        conditions.push(eq(handoffs.toUserId, user.id));
      } else {
        conditions.push(or(eq(handoffs.fromUserId, user.id), eq(handoffs.toUserId, user.id)));
      }
    } else {
      // No workspace_id: filter by current user's role
      if (query.role === 'from') {
        conditions.push(eq(handoffs.fromUserId, user.id));
      } else if (query.role === 'to') {
        conditions.push(eq(handoffs.toUserId, user.id));
      } else {
        conditions.push(or(eq(handoffs.fromUserId, user.id), eq(handoffs.toUserId, user.id)));
      }
    }

    if (query.status) {
      conditions.push(eq(handoffs.status, query.status as any));
    }

    const fromUser = aliasedTable(users, 'from_user');
    const toUser = aliasedTable(users, 'to_user');

    const rows = await db
      .select({
        handoff: handoffs,
        from_user_name: fromUser.name,
        from_user_avatar: fromUser.avatarUrl,
        to_user_name: toUser.name,
        to_user_avatar: toUser.avatarUrl,
      })
      .from(handoffs)
      .leftJoin(fromUser, eq(handoffs.fromUserId, fromUser.id))
      .leftJoin(toUser, eq(handoffs.toUserId, toUser.id))
      .where(and(...conditions));

    return rows.map((r) => ({
      ...r.handoff,
      from_user_name: r.from_user_name,
      from_user_avatar: r.from_user_avatar,
      to_user_name: r.to_user_name,
      to_user_avatar: r.to_user_avatar,
    }));
>>>>>>> 2e221bb (fix: align frontend interface with API contract (from_user_name/avatar fields))
  });

  // List
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;
    const query = request.query as { workspace_id?: string; role?: string; status?: string };

    let condition = or(eq(handoffs.fromUserId, user.id), eq(handoffs.toUserId, user.id))!;

    if (query.workspace_id) {
      condition = and(condition, eq(handoffs.workspaceId, query.workspace_id))!;
    }
    if (query.role === 'from') {
      condition = query.workspace_id
        ? and(eq(handoffs.fromUserId, user.id), eq(handoffs.workspaceId, query.workspace_id))!
        : eq(handoffs.fromUserId, user.id);
    } else if (query.role === 'to') {
      condition = query.workspace_id
        ? and(eq(handoffs.toUserId, user.id), eq(handoffs.workspaceId, query.workspace_id))!
        : eq(handoffs.toUserId, user.id);
    }
    if (query.status) {
      condition = and(condition, eq(handoffs.status, query.status as any))!;
    }

    const results = await db.select().from(handoffs).where(condition);

    // Enrich with user names
    const userIds = [...new Set(results.flatMap(h => [h.fromUserId, h.toUserId]))];
    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const allUsers = await db.select({ id: users.id, name: users.name }).from(users)
        .where(or(...userIds.map(uid => eq(users.id, uid))));
      for (const u of allUsers) {
        userMap.set(u.id, u.name || '');
      }
    }

    return results.map(h => ({
      ...h,
      from_user_name: userMap.get(h.fromUserId) || '',
      to_user_name: userMap.get(h.toUserId) || '',
    }));
  });
}
