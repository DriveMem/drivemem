/**
 * Handoff MCP Tools — handoff_send, handoff_accept, handoff_request_more
 * Uses direct DB access matching the pattern in create-server.ts
 */
import { db } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { validateContextPack } from '../../services/handoff-validator.js';
import { notifyHandoffRecipient } from '../../services/handoff-webhook.js';

export const handoffTools = [
  {
    name: 'handoff_send',
    description: 'Send a work handoff to another team member with context pack',
    inputSchema: {
      type: 'object' as const,
      required: ['to_user_email', 'workspace_id', 'task', 'next_steps'],
      properties: {
        to_user_email: { type: 'string', description: 'Recipient email' },
        workspace_id: { type: 'string', description: 'Workspace UUID' },
        task: { type: 'string', description: 'Task description being handed off' },
        next_steps: { type: 'array', items: { type: 'string' }, description: 'Recommended next steps' },
        decisions: { type: 'array', items: { type: 'object', properties: { decision: { type: 'string' }, reason: { type: 'string' } } }, description: 'Key decisions made' },
        key_facts: { type: 'array', items: { type: 'string' }, description: 'Important context facts' },
        notes: { type: 'string', description: 'Additional notes' },
      },
    },
  },
  {
    name: 'handoff_accept',
    description: 'Accept a received handoff',
    inputSchema: {
      type: 'object' as const,
      required: ['handoff_id'],
      properties: {
        handoff_id: { type: 'string', description: 'Handoff UUID to accept' },
      },
    },
  },
  {
    name: 'handoff_request_more',
    description: 'Request more information on a received handoff',
    inputSchema: {
      type: 'object' as const,
      required: ['handoff_id', 'questions'],
      properties: {
        handoff_id: { type: 'string', description: 'Handoff UUID' },
        questions: { type: 'array', items: { type: 'string' }, description: 'Questions to ask the sender' },
      },
    },
  },
];

export async function handleHandoffTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  switch (name) {
    case 'handoff_send': {
      const toEmail = args.to_user_email as string;
      const workspaceId = args.workspace_id as string;
      const task = args.task as string;
      const nextSteps = args.next_steps as string[];
      const decisions = args.decisions as { decision: string; reason: string }[] | undefined;
      const keyFacts = args.key_facts as string[] | undefined;
      const notes = args.notes as string | undefined;

      // Lookup recipient by email
      const [recipient] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, toEmail));

      if (!recipient) {
        return { content: [{ type: 'text', text: `Error: User with email "${toEmail}" not found.` }], isError: true };
      }

      if (recipient.id === userId) {
        return { content: [{ type: 'text', text: 'Error: Cannot create handoff to yourself.' }], isError: true };
      }

      // Verify workspace membership
      const members = await db
        .select({ userId: schema.workspaceMembers.userId })
        .from(schema.workspaceMembers)
        .where(
          and(
            eq(schema.workspaceMembers.workspaceId, workspaceId),
            or(eq(schema.workspaceMembers.userId, userId), eq(schema.workspaceMembers.userId, recipient.id))
          )
        );
      const memberIds = members.map((m) => m.userId);
      if (!memberIds.includes(userId) || !memberIds.includes(recipient.id)) {
        return { content: [{ type: 'text', text: 'Error: Both users must be members of the workspace.' }], isError: true };
      }

      // Build context pack
      const contextPack: Record<string, unknown> = {
        task,
        next_steps: nextSteps,
      };
      if (decisions) contextPack.decisions = decisions;
      if (keyFacts) contextPack.key_facts = keyFacts;
      if (notes) contextPack.notes = notes;

      // Create handoff
      const [handoff] = await db
        .insert(schema.handoffs)
        .values({
          workspaceId,
          fromUserId: userId,
          toUserId: recipient.id,
          contextPack,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        })
        .returning();

      // Validate and send
      const validation = validateContextPack(handoff.contextPack);
      if (!validation.valid) {
        return {
          content: [{ type: 'text', text: `Handoff created (${handoff.id}) but context pack incomplete. Missing: ${validation.missing?.join(', ')}. Status: draft.` }],
        };
      }

      // Transition to sent
      const [sent] = await db
        .update(schema.handoffs)
        .set({ status: 'sent', updatedAt: new Date() })
        .where(eq(schema.handoffs.id, handoff.id))
        .returning();

      // Notify recipient
      const [recipientUser] = await db.select({ webhookUrl: schema.users.webhookUrl }).from(schema.users).where(eq(schema.users.id, sent.toUserId));
      notifyHandoffRecipient(recipientUser?.webhookUrl, {
        event: 'handoff.received',
        handoff_id: sent.id,
        from_user_id: sent.fromUserId,
        to_user_id: sent.toUserId,
        summary: task,
        timestamp: new Date().toISOString(),
      });

      return {
        content: [{ type: 'text', text: `✅ Handoff sent successfully!\n\nHandoff ID: ${sent.id}\nTo: ${toEmail}\nStatus: sent\nTask: ${task}\nNext steps: ${nextSteps.join(', ')}` }],
      };
    }

    case 'handoff_accept': {
      const handoffId = args.handoff_id as string;

      const [handoff] = await db.select().from(schema.handoffs).where(eq(schema.handoffs.id, handoffId));
      if (!handoff) {
        return { content: [{ type: 'text', text: 'Error: Handoff not found.' }], isError: true };
      }
      if (handoff.toUserId !== userId) {
        return { content: [{ type: 'text', text: 'Error: You are not the recipient of this handoff.' }], isError: true };
      }

      // Auto-transition sent → received if needed
      if (handoff.status === 'sent') {
        await db.update(schema.handoffs).set({ status: 'received', updatedAt: new Date() }).where(eq(schema.handoffs.id, handoffId));
        handoff.status = 'received';
      }

      if (handoff.status !== 'received') {
        return { content: [{ type: 'text', text: `Error: Cannot accept from status: ${handoff.status}` }], isError: true };
      }

      const [updated] = await db
        .update(schema.handoffs)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(schema.handoffs.id, handoffId))
        .returning();

      return {
        content: [{ type: 'text', text: `✅ Handoff accepted!\n\nHandoff ID: ${updated.id}\nStatus: accepted` }],
      };
    }

    case 'handoff_request_more': {
      const handoffId = args.handoff_id as string;
      const questions = args.questions as string[];

      const [handoff] = await db.select().from(schema.handoffs).where(eq(schema.handoffs.id, handoffId));
      if (!handoff) {
        return { content: [{ type: 'text', text: 'Error: Handoff not found.' }], isError: true };
      }
      if (handoff.toUserId !== userId) {
        return { content: [{ type: 'text', text: 'Error: You are not the recipient of this handoff.' }], isError: true };
      }

      // Auto-transition sent → received if needed
      if (handoff.status === 'sent') {
        await db.update(schema.handoffs).set({ status: 'received', updatedAt: new Date() }).where(eq(schema.handoffs.id, handoffId));
        handoff.status = 'received';
      }

      if (handoff.status !== 'received') {
        return { content: [{ type: 'text', text: `Error: Cannot request more from status: ${handoff.status}` }], isError: true };
      }

      const supplementRequests = [...((handoff.supplementRequests as any[]) || []), { questions, at: new Date().toISOString() }];

      const [updated] = await db
        .update(schema.handoffs)
        .set({ status: 'request_more', supplementRequests, updatedAt: new Date() })
        .where(eq(schema.handoffs.id, handoffId))
        .returning();

      const [senderUser] = await db.select({ webhookUrl: schema.users.webhookUrl }).from(schema.users).where(eq(schema.users.id, updated.fromUserId));
      notifyHandoffRecipient(senderUser?.webhookUrl, {
        event: 'handoff.request_more',
        handoff_id: updated.id,
        from_user_id: updated.fromUserId,
        to_user_id: updated.toUserId,
        summary: questions.join('; '),
        timestamp: new Date().toISOString(),
      });

      return {
        content: [{ type: 'text', text: `✅ More information requested!\n\nHandoff ID: ${updated.id}\nStatus: request_more\nQuestions:\n${questions.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}` }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown handoff tool: ${name}` }], isError: true };
  }
}
