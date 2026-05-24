import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { handoffs, workspaceMembers } from '../db/schema.js';
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
    if (!['draft', 'supplementing'].includes(handoff.status)) {
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

    const [updated] = await db
      .update(handoffs)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(eq(handoffs.id, id))
      .returning();

    // Fire webhook (non-blocking)
    notifyHandoffRecipient(
      { id: updated.id, from_user_id: updated.fromUserId, to_user_id: updated.toUserId, context_pack: updated.contextPack },
      updated.toUserId,
      'handoff.received'
    );

    return updated;
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

    const [handoff] = await db.select().from(handoffs).where(eq(handoffs.id, id));
    if (!handoff) return reply.code(404).send({ error: 'Not found' });
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
      return updated;
    }

    return handoff;
  });

  // GET / — list handoffs
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const query = request.query as { workspace_id?: string; status?: string; role?: string };

    if (!query.workspace_id) {
      return reply.code(400).send({ error: 'workspace_id is required' });
    }

    // Verify user is workspace member
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, query.workspace_id), eq(workspaceMembers.userId, user.id)));
    if (!membership) return reply.code(403).send({ error: 'Not a workspace member' });

    const conditions: any[] = [eq(handoffs.workspaceId, query.workspace_id)];

    if (query.role === 'from') {
      conditions.push(eq(handoffs.fromUserId, user.id));
    } else if (query.role === 'to') {
      conditions.push(eq(handoffs.toUserId, user.id));
    } else {
      conditions.push(or(eq(handoffs.fromUserId, user.id), eq(handoffs.toUserId, user.id)));
    }

    if (query.status) {
      conditions.push(eq(handoffs.status, query.status as any));
    }

    const rows = await db.select().from(handoffs).where(and(...conditions));
    return rows;
  });

  // TODO: cron job for expires_at → expired transition
}
