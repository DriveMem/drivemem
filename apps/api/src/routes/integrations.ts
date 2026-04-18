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

  // --- GitHub OAuth Connect ---
  fastify.get('/github/connect', async (request, reply) => {
    await requireAuth(request, reply);
    if (!config.GITHUB_INTEGRATION_CLIENT_ID || !config.GITHUB_INTEGRATION_CLIENT_SECRET) {
      return reply.status(501).send({ error: { message: 'GitHub integration not configured' } });
    }
    const state = request.user!.id;
    const redirectUri = `https://api.drivemem.cloud/api/integrations/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${config.GITHUB_INTEGRATION_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user&state=${state}`;
    return reply.redirect(url);
  });

  // --- GitHub OAuth Callback ---
  fastify.get('/github/callback', async (request, reply) => {
    if (!config.GITHUB_INTEGRATION_CLIENT_ID || !config.GITHUB_INTEGRATION_CLIENT_SECRET) {
      return reply.status(501).send({ error: { message: 'GitHub integration not configured' } });
    }
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code || !state) {
      return reply.status(400).send({ error: { message: 'Missing code or state' } });
    }

    const userId = state;

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: config.GITHUB_INTEGRATION_CLIENT_ID,
        client_secret: config.GITHUB_INTEGRATION_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      fastify.log.error({ status: tokenRes.status, body: await tokenRes.text() }, 'GitHub OAuth token exchange failed');
      return reply.redirect(`${config.FRONTEND_URL}/settings?tab=developer&github=error`);
    }

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      fastify.log.error({ tokenData }, 'GitHub OAuth: no access_token');
      return reply.redirect(`${config.FRONTEND_URL}/settings?tab=developer&github=error`);
    }

    // Get GitHub username
    let username = '';
    let githubId = '';
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' },
      });
      if (userRes.ok) {
        const userData = await userRes.json() as { login: string; id: number };
        username = userData.login;
        githubId = String(userData.id);
      }
    } catch { /* proceed without username */ }

    // Upsert integration record
    const existing = await db.select().from(schema.integrations)
      .where(and(eq(schema.integrations.userId, userId), eq(schema.integrations.provider, 'github')))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.integrations)
        .set({
          accessToken: tokenData.access_token,
          externalAccountId: githubId || null,
          externalAccountName: username || null,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(schema.integrations.id, existing[0].id));
    } else {
      await db.insert(schema.integrations).values({
        userId,
        provider: 'github',
        accessToken: tokenData.access_token,
        externalAccountId: githubId || null,
        externalAccountName: username || null,
        config: { syncEnabled: true, lastSyncAt: null, syncedIssueUrls: [] },
      });
    }

    return reply.redirect(`${config.FRONTEND_URL}/settings?tab=developer&github=connected`);
  });

  // --- Google Drive OAuth Connect ---
  fastify.get('/google-drive/connect', async (request, reply) => {
    await requireAuth(request, reply);
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return reply.status(501).send({ error: { message: 'Google Drive integration not configured' } });
    }
    const state = request.user!.id;
    const redirectUri = `https://api.drivemem.cloud/api/integrations/google-drive/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(config.GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email')}&access_type=offline&prompt=consent&state=${state}`;
    return reply.redirect(url);
  });

  // --- Google Drive OAuth Callback ---
  fastify.get('/google-drive/callback', async (request, reply) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return reply.status(501).send({ error: { message: 'Google Drive integration not configured' } });
    }
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code || !state) {
      return reply.status(400).send({ error: { message: 'Missing code or state' } });
    }

    const userId = state;
    const redirectUri = `https://api.drivemem.cloud/api/integrations/google-drive/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      fastify.log.error({ status: tokenRes.status, body: await tokenRes.text() }, 'Google OAuth token exchange failed');
      return reply.redirect(`${config.FRONTEND_URL}/settings?tab=developer&google-drive=error`);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // Get user email
    let email = '';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json() as { email: string; id: string };
        email = userData.email;
      }
    } catch { /* proceed without email */ }

    // Upsert integration record
    const existing = await db.select().from(schema.integrations)
      .where(and(eq(schema.integrations.userId, userId), eq(schema.integrations.provider, 'google-drive')))
      .limit(1);

    if (existing.length > 0) {
      const updateData: Record<string, any> = {
        accessToken: tokenData.access_token,
        externalAccountName: email || null,
        status: 'active' as const,
        updatedAt: new Date(),
      };
      if (tokenData.refresh_token) {
        updateData.refreshToken = tokenData.refresh_token;
      }
      await db.update(schema.integrations)
        .set(updateData)
        .where(eq(schema.integrations.id, existing[0].id));
    } else {
      await db.insert(schema.integrations).values({
        userId,
        provider: 'google-drive',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        externalAccountName: email || null,
        config: { syncEnabled: true, lastSyncAt: null, syncedFileIds: [] },
      });
    }

    return reply.redirect(`${config.FRONTEND_URL}/settings?tab=developer&google-drive=connected`);
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

    try {
      if (integration.provider === 'notion') {
        const { syncNotionPages } = await import('../services/notion-sync.js');
        const result = await syncNotionPages(integration);
        return reply.send(result);
      } else if (integration.provider === 'github') {
        const { syncGitHubRepos } = await import('../services/github-sync.js');
        const result = await syncGitHubRepos(integration);
        return reply.send(result);
      } else if (integration.provider === 'google-drive') {
        const { syncGoogleDrive } = await import('../services/google-drive-sync.js');
        const result = await syncGoogleDrive(integration);
        return reply.send(result);
      } else {
        return reply.status(400).send({ error: { message: `Sync not supported for provider: ${integration.provider}` } });
      }
    } catch (err: any) {
      fastify.log.error(err, `${integration.provider} sync failed`);
      return reply.status(500).send({ error: { message: err.message || 'Sync failed' } });
    }
  });
}
