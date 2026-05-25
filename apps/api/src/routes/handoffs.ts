import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, or, sql, aliasedTable } from 'drizzle-orm';
import { db } from '../db/index.js';
import { handoffs, workspaceMembers, users } from '../db/schema.js';
import { assessContextPack } from '../services/handoff-intelligence.js';
import { requireAuth } from '../plugins/auth.js';
import { validateContextPack } from '../services/handoff-validator.js';
import { notifyHandoffRecipient } from '../services/handoff-webhook.js';

const TERMINAL_STATES = ['accepted', 'rejected', 'expired'] as const;

function deepMergeContextPack(existing: any, patch: any): any {
  const result = { ...existing };
  for (const key of Object.keys(patch)) {
    const existingVal = existing[key];
    const patchVal = patch[key];
    if (Array.isArray(existingVal) && Array.isArray(patchVal)) {
      result[key] = [...existingVal, ...patchVal];
    } else if (typeof patchVal === 'string') {
      result[key] = patchVal;
    } else if (patchVal && typeof patchVal === 'object' && !Array.isArray(patchVal)) {
      result[key] = deepMergeContextPack(existingVal || {}, patchVal);
    } else {
      result[key] = patchVal;
    }
  }
  return result;
}

const createSchema = z.object({
  workspace_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  context_pack: z.record(z.any()).optional().default({}),
});

const patchSchema = z.object({
  context_pack: z.record(z.any()),
});

export default async function handoffRoutes(app: FastifyInstance) {
  // Helper: verify both users are in the same workspace
  async function verifyWorkspaceMembership(workspaceId: string, fromUserId: string, toUserId: string) {
    const members = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          or(eq(workspaceMembers.userId, fromUserId), eq(workspaceMembers.userId, toUserId))
        )
      );
    const memberIds = members.map((m) => m.userId);
    return memberIds.includes(fromUserId) && memberIds.includes(toUserId);
  }

  // POST / — create handoff
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const body = createSchema.parse(request.body);

    if (body.to_user_id === user.id) {
      return reply.code(400).send({ error: 'Cannot create handoff to yourself' });
    }

    const bothMembers = await verifyWorkspaceMembership(body.workspace_id, user.id, body.to_user_id);
    if (!bothMembers) {
      return reply.code(403).send({ error: 'Both users must be members of the workspace' });
    }

    const [handoff] = await db
      .insert(handoffs)
      .values({
        workspaceId: body.workspace_id,
        fromUserId: user.id,
        toUserId: body.to_user_id,
        contextPack: body.context_pack,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      })
      .returning();

    return reply.code(201).send(handoff);
  });

  // PATCH /:id — append to context_pack
  app.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = patchSchema.parse(request.body);

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.code(404).send({ error: 'Not found' });
    if (handoff.fromUserId !== user.id) return reply.code(403).send({ error: 'Forbidden' });
    if (!['draft', 'supplementing', 'request_more'].includes(handoff.status)) {
      return reply.code(409).send({ error: 'Cannot modify in current status' });
    }

    const mergedPack = deepMergeContextPack(handoff.contextPack as any, body.context_pack);
    const newStatus = handoff.status === 'request_more' ? 'supplementing' : handoff.status;

    // Auto-transition: request_more → supplementing when from_user PATCHes
    const statusToSet = handoff.status === 'request_more' ? 'supplementing' as const : 
                        handoff.status === 'supplementing' ? 'supplementing' as const : 
                        'draft' as const;

    const [updated] = await db
      .update(handoffs)
      .set({
        contextPack: mergedPack,
        status: statusToSet,
        updatedAt: new Date(),
      })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // POST /:id/send — draft → sent
  app.post('/:id/send', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.code(404).send({ error: 'Not found' });
    if (handoff.fromUserId !== user.id) return reply.code(403).send({ error: 'Forbidden' });
    if (handoff.status !== 'draft') {
      return reply.code(409).send({ error: `Cannot send from status: ${handoff.status}` });
    }

    const validation = validateContextPack(handoff.contextPack);
    if (!validation.valid) {
      return reply.code(400).send({ error: 'incomplete_context_pack', missing: validation.missing });
    }

    // LLM-based quality assessment (second layer)
    const assessment = await assessContextPack(handoff.contextPack);

    if (assessment.confidence === 0 || (assessment.score >= 70 && assessment.sufficient)) {
      // Quality sufficient — send normally
      const [updated] = await db
        .update(handoffs)
        .set({ status: 'sent', qualityScore: assessment.score, updatedAt: new Date() })
        .where(eq(handoffs.id, id))
        .returning();

      // Fire webhook (non-blocking)
      notifyHandoffRecipient(
        { id: updated.id, from_user_id: updated.fromUserId, to_user_id: updated.toUserId, context_pack: updated.contextPack },
        updated.toUserId,
        'handoff.received'
      );

      return updated;
    } else if ((handoff.autoSupplementCount ?? 0) < 3) {
      // Auto-request supplement
      const newCount = (handoff.autoSupplementCount ?? 0) + 1;
      const supplementEntry = {
        source: 'auto',
        questions: assessment.missing,
        timestamp: new Date().toISOString(),
      };
      const currentRequests = Array.isArray(handoff.supplementRequests) ? handoff.supplementRequests : [];

      const [updated] = await db
        .update(handoffs)
        .set({
          status: 'request_more',
          autoSupplementCount: newCount,
          qualityScore: assessment.score,
          supplementRequests: [...currentRequests, supplementEntry],
          updatedAt: new Date(),
        })
        .where(eq(handoffs.id, id))
        .returning();

      // Notify sender that supplement is needed
      notifyHandoffRecipient(
        { id: updated.id, from_user_id: updated.fromUserId, to_user_id: updated.toUserId, context_pack: updated.contextPack },
        updated.fromUserId,
        'handoff.request_more'
      );

      return reply.send({ ...updated, auto_supplement: true, missing: assessment.missing });
    } else {
      // 3 rounds exhausted — force send with warning
      const warning = `Information completeness: ${assessment.score}/100. Missing: ${assessment.missing.join(', ')}`;
      const [updated] = await db
        .update(handoffs)
        .set({ status: 'sent', qualityScore: assessment.score, qualityWarning: warning, updatedAt: new Date() })
        .where(eq(handoffs.id, id))
        .returning();

      // Fire webhook with warning
      notifyHandoffRecipient(
        { id: updated.id, from_user_id: updated.fromUserId, to_user_id: updated.toUserId, context_pack: updated.contextPack },
        updated.toUserId,
        'handoff.received'
      );

      return updated;
    }
  });

  // POST /:id/supplement — supplementing → sent
  app.post('/:id/supplement', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.code(404).send({ error: 'Not found' });
    if (handoff.fromUserId !== user.id) return reply.code(403).send({ error: 'Forbidden' });
    if (handoff.status !== 'supplementing') {
      return reply.code(409).send({ error: `Cannot supplement from status: ${handoff.status}` });
    }

    const validation = validateContextPack(handoff.contextPack);
    if (!validation.valid) {
      return reply.code(400).send({ error: 'incomplete_context_pack', missing: validation.missing });
    }

    const [updated] = await db
      .update(handoffs)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    notifyHandoffRecipient(
      { id: updated.id, from_user_id: updated.fromUserId, to_user_id: updated.toUserId, context_pack: updated.contextPack },
      updated.toUserId,
      'handoff.supplement'
    );

    return updated;
  });

  // POST /:id/accept — received → accepted
  app.post('/:id/accept', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.code(404).send({ error: 'Not found' });
    if (handoff.toUserId !== user.id) return reply.code(403).send({ error: 'Forbidden' });
    if (handoff.status !== 'received') {
      return reply.code(409).send({ error: `Cannot accept from status: ${handoff.status}` });
    }

    const [updated] = await db
      .update(handoffs)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // POST /:id/reject — received → rejected
  app.post('/:id/reject', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = z.object({ reason: z.string().optional() }).parse(request.body || {});

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.code(404).send({ error: 'Not found' });
    if (handoff.toUserId !== user.id) return reply.code(403).send({ error: 'Forbidden' });
    if (handoff.status !== 'received') {
      return reply.code(409).send({ error: `Cannot reject from status: ${handoff.status}` });
    }

    const supplementRequests = handoff.supplementRequests as any[] || [];
    if (body.reason) {
      supplementRequests.push({ type: 'rejection_reason', reason: body.reason, at: new Date().toISOString() });
    }

    const [updated] = await db
      .update(handoffs)
      .set({ status: 'rejected', supplementRequests, updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    return updated;
  });

  // POST /:id/request-more — received → request_more
  app.post('/:id/request-more', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = z.object({ questions: z.array(z.string()) }).parse(request.body);

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.code(404).send({ error: 'Not found' });
    if (handoff.toUserId !== user.id) return reply.code(403).send({ error: 'Forbidden' });
    if (handoff.status !== 'received') {
      return reply.code(409).send({ error: `Cannot request more from status: ${handoff.status}` });
    }

    const supplementRequests = [...((handoff.supplementRequests as any[]) || []), { questions: body.questions, at: new Date().toISOString() }];

    const [updated] = await db
      .update(handoffs)
      .set({ status: 'request_more', supplementRequests, updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    notifyHandoffRecipient(
      { id: updated.id, from_user_id: updated.fromUserId, to_user_id: updated.toUserId, context_pack: updated.contextPack },
      updated.fromUserId,
      'handoff.request_more'
    );

    return updated;
  });

  // GET /:id — detail (auto-transition sent → received)
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

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
  });

  // TODO: cron job for expires_at → expired transition
}
