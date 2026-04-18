import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';
import { config } from '../lib/config.js';

export default async function integrationRoutes(fastify: FastifyInstance) {
  // --- Notion OAuth Connect ---
  fastify.get('/notion/connect', async (request, reply) => {
    await requireAuth(request, reply);
    if (!config.NOTION_CLIENT_ID || !config.NOTION_CLIENT_SECRET) {
      return reply.status(501).send({ error: { message: 'Notion integration not configured' } });
    }
    const redirectUri = `${config.FRONTEND_URL.replace(/\/$/, '').replace('drivemem.cloud', 'api.drivemem.cloud').replace(':3000', ':3001')}/api/integrations/notion/callback`;
    const state = request.user!.id; // simple state = userId (OK for MVP)
    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${config.NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    return reply.redirect(url);
  });

  // --- Notion OAuth Callback ---
  fastify.get('/notion/callback', async (request, reply) => {
    if (!config.NOTION_CLIENT_ID || !config.NOTION_CLIENT_SECRET) {
      return reply.status(501).send({ error: { message: 'Notion integration not configured' } });
    }
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code || !state) {
      return reply.status(400).send({ error: { message: 'Missing code or state' } });
    }

    const userId = state;
    const redirectUri = `${config.FRONTEND_URL.replace(/\/$/, '').replace('drivemem.cloud', 'api.drivemem.cloud').replace(':3000', ':3001')}/api/integrations/notion/callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.NOTION_CLIENT_ID}:${config.NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      fastify.log.error({ status: tokenRes.status, body: await tokenRes.text() }, 'Notion OAuth token exchange failed');
      return reply.redirect(`${config.FRONTEND_URL}/settings?tab=developer&notion=error`);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      workspace_id?: string;
      workspace_name?: string;
    };

    // Upsert integration record
    const existing = await db.select().from(schema.integrations)
      .where(and(eq(schema.integrations.userId, userId), eq(schema.integrations.provider, 'notion')))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.integrations)
        .set({
          accessToken: tokenData.access_token,
          externalAccountId: tokenData.workspace_id || null,
          externalAccountName: tokenData.workspace_name || null,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(schema.integrations.id, existing[0].id));
    } else {
      await db.insert(schema.integrations).values({
        userId,
        provider: 'notion',
        accessToken: tokenData.access_token,
        externalAccountId: tokenData.workspace_id || null,
        externalAccountName: tokenData.workspace_name || null,
        config: { syncEnabled: true, lastSyncAt: null, syncedPageIds: [] },
      });
    }

    return reply.redirect(`${config.FRONTEND_URL}/settings?tab=developer&notion=connected`);
  });

  // --- List user integrations ---
  fastify.get('/', async (request, reply) => {
    await requireAuth(request, reply);
    const rows = await db.select({
      id: schema.integrations.id,
      provider: schema.integrations.provider,
      externalAccountId: schema.integrations.externalAccountId,
      externalAccountName: schema.integrations.externalAccountName,
      config: schema.integrations.config,
      status: schema.integrations.status,
      createdAt: schema.integrations.createdAt,
      updatedAt: schema.integrations.updatedAt,
    }).from(schema.integrations)
      .where(eq(schema.integrations.userId, request.user!.id));
    return reply.send({ integrations: rows });
  });

  // --- Disconnect integration ---
  fastify.delete('/:id', async (request, reply) => {
    await requireAuth(request, reply);
    const { id } = request.params as { id: string };
    const deleted = await db.delete(schema.integrations)
      .where(and(eq(schema.integrations.id, id), eq(schema.integrations.userId, request.user!.id)))
      .returning();
    if (deleted.length === 0) {
      return reply.status(404).send({ error: { message: 'Integration not found' } });
    }
    return reply.send({ ok: true });
  });

  // --- Manual sync trigger ---
  fastify.post('/:id/sync', async (request, reply) => {
    await requireAuth(request, reply);
    const { id } = request.params as { id: string };
    const rows = await db.select().from(schema.integrations)
      .where(and(eq(schema.integrations.id, id), eq(schema.integrations.userId, request.user!.id)))
      .limit(1);
    if (rows.length === 0) {
      return reply.status(404).send({ error: { message: 'Integration not found' } });
    }
    const integration = rows[0];
    if (integration.provider !== 'notion') {
      return reply.status(400).send({ error: { message: 'Only Notion sync is supported' } });
    }

    try {
      const { syncNotionPages } = await import('../services/notion-sync.js');
      const result = await syncNotionPages(integration);
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(err, 'Notion sync failed');
      return reply.status(500).send({ error: { message: err.message || 'Sync failed' } });
    }
  });
}
