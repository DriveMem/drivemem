import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { createMcpServer } from '../mcp/create-server.js';
import { db } from '../db/index.js';
import { agentConnections } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { trackToolCall, onSessionDisconnect } from '../services/session-idle-summary.js';

// --- Agent Connection Tracking (fire-and-forget) ---
async function trackConnectionOpen(userId: string, apiKeyId: string | undefined, agentName: string, transport: string): Promise<string | null> {
  try {
    // Track activation action: mcp_connect
    import('../services/nudge.service.js').then(({ recordActivationAction }) => {
      recordActivationAction(userId, 'mcp_connect').catch(() => {});
    }).catch(() => {});

    const [row] = await db.insert(agentConnections).values({
      userId,
      apiKeyId: apiKeyId || null,
      agentName: agentName || 'unknown',
      transport,
      status: 'online',
    }).returning({ id: agentConnections.id });
    return row?.id ?? null;
  } catch (e) {
    console.error('[MCP] trackConnectionOpen failed:', e);
    return null;
  }
}

async function trackConnectionActivity(connectionId: string | null) {
  if (!connectionId) return;
  try {
    await db.update(agentConnections)
      .set({ lastActiveAt: new Date() })
      .where(eq(agentConnections.id, connectionId));
  } catch { /* fire-and-forget */ }
}

async function trackConnectionClose(connectionId: string | null) {
  if (!connectionId) return;
  try {
    await db.update(agentConnections)
      .set({ status: 'offline', disconnectedAt: new Date() })
      .where(eq(agentConnections.id, connectionId));
  } catch { /* fire-and-forget */ }
}

export default async function mcpHttpRoutes(fastify: FastifyInstance) {
  // Active sessions: sessionId -> { transport, server }
  const sessions = new Map<string, { transport: SSEServerTransport | StreamableHTTPServerTransport; server: any }>();

  // Session idle summary is handled per-session via session-idle-summary service

  // =========================================================================
  // Streamable HTTP transport (Protocol version 2025-11-25)
  // Cursor and newer MCP clients use this.
  // POST / without mcp-session-id + initialize body → new session
  // POST / with mcp-session-id → route to existing session
  // GET  / with mcp-session-id → SSE stream for server-initiated messages
  // DELETE / with mcp-session-id → close session
  // =========================================================================

  // POST / — handles both Streamable HTTP and legacy SSE message posting
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireApiKey(request, reply);
    if (reply.sent) return;

    const userId = request.user!.id;
    const agentName = (request as any).apiKeyName || '';

    // Check for Streamable HTTP session header
    const mcpSessionId = request.headers['mcp-session-id'] as string | undefined;

    // Check for legacy SSE sessionId query param
    const legacySessionId = (request.query as any)?.sessionId as string | undefined;

    if (legacySessionId) {
      // --- Legacy SSE POST path ---
      const session = sessions.get(legacySessionId);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found. Establish SSE connection first.' });
      }
      if (!(session.transport instanceof SSEServerTransport)) {
        return reply.status(400).send({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session uses a different transport protocol' },
          id: null,
        });
      }
      await session.transport.handlePostMessage(request.raw, reply.raw, request.body);
      reply.hijack();
      return;
    }

    if (mcpSessionId) {
      // --- Streamable HTTP: subsequent request with existing session ---
      const session = sessions.get(mcpSessionId);
      if (!session) {
        // Session expired (server restart?) — auto-rebuild for Streamable HTTP
        console.log(`[MCP] Session ${mcpSessionId} expired, auto-rebuilding...`);
        // Fall through to initialize path below
      } else if (!(session.transport instanceof StreamableHTTPServerTransport)) {
        return reply.status(400).send({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session uses a different transport protocol' },
          id: null,
        });
      } else {
        await session.transport.handleRequest(request.raw, reply.raw, request.body);
        reply.hijack();
        return;
      }
    }

    // --- Streamable HTTP: new session (initialize request) ---
    if (isInitializeRequest(request.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId: string) => {
          sessions.set(sessionId, { transport, server: mcpServer });
        },
      });

      let connectionId: string | null = null;

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          onSessionDisconnect(sid);
          sessions.delete(sid);
        }
        trackConnectionClose(connectionId);
      };

      const mcpServer = createMcpServer(userId, agentName, {
        apiKeyId: (request as any).apiKeyId,
        onToolCall: (toolName, toolArgs) => {
          const sid = transport.sessionId;
          if (sid) trackToolCall(sid, userId, agentName, toolName, toolArgs);
          trackConnectionActivity(connectionId);
        },
      });
      await mcpServer.connect(transport);
      trackConnectionOpen(userId, (request as any).apiKeyId, agentName, 'streamable-http').then(id => { connectionId = id; });
      await transport.handleRequest(request.raw, reply.raw, request.body);
      reply.hijack();
      return;
    }

    // Neither legacy SSE nor valid Streamable HTTP
    return reply.status(400).send({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Bad Request: missing session ID or not an initialize request' },
      id: null,
    });
  });

  // GET / — SSE endpoints (both legacy and Streamable HTTP GET for server notifications)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireApiKey(request, reply);
    if (reply.sent) return;

    const mcpSessionId = request.headers['mcp-session-id'] as string | undefined;

    if (mcpSessionId) {
      // --- Streamable HTTP GET: SSE stream for server-initiated messages ---
      const session = sessions.get(mcpSessionId);
      if (!session) {
        return reply.status(404).send({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session not found' },
          id: null,
        });
      }
      if (!(session.transport instanceof StreamableHTTPServerTransport)) {
        return reply.status(400).send({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session uses a different transport protocol' },
          id: null,
        });
      }
      await session.transport.handleRequest(request.raw, reply.raw);
      reply.hijack();
      return;
    }

    // --- Legacy SSE: establish new SSE connection ---
    const userId = request.user!.id;
    const agentName = (request as any).apiKeyName || '';

    let sseConnectionId: string | null = null;

    const mcpServer = createMcpServer(userId, agentName, {
      apiKeyId: (request as any).apiKeyId,
      onToolCall: (toolName, toolArgs) => {
        trackToolCall(sessionId, userId, agentName, toolName, toolArgs);
        trackConnectionActivity(sseConnectionId);
      },
    });
    const transport = new SSEServerTransport('/mcp', reply.raw);

    // SSE keepalive — send comment every 15s to prevent proxy/CF timeout
    const keepalive = setInterval(() => {
      try { reply.raw.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
    }, 15000);

    const sessionId = (transport as any)._sessionId as string;
    sessions.set(sessionId, { transport, server: mcpServer });

    transport.onclose = () => {
      clearInterval(keepalive);
      onSessionDisconnect(sessionId);
      sessions.delete(sessionId);
      trackConnectionClose(sseConnectionId);
    };

    await mcpServer.connect(transport);
    trackConnectionOpen(userId, (request as any).apiKeyId, agentName, 'sse').then(id => { sseConnectionId = id; });
    reply.hijack();
  });

  // DELETE / — Streamable HTTP session termination
  // GET /sse — alias for SSE endpoint (some clients use /mcp/sse instead of /mcp)
  fastify.get('/sse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Same logic as GET / — SSE connection
    await requireApiKey(request, reply);
    if (reply.sent) return;
    const userId = request.user!.id;
    const agentName = (request as any).apiKeyName || '';
    const apiKeyId = (request as any).apiKeyId;
    const mcpServer = createMcpServer(userId, agentName, { onToolCall: () => {}, apiKeyId });
    const transport = new SSEServerTransport('/mcp/sse', reply.raw);

    // SSE keepalive — send comment every 15s to prevent proxy/CF timeout
    const keepalive = setInterval(() => {
      try { reply.raw.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
    }, 15000);

    const sessionId = transport.sessionId;
    sessions.set(sessionId, { transport, server: mcpServer });
    reply.raw.on('close', () => { clearInterval(keepalive); sessions.delete(sessionId); });
    await mcpServer.connect(transport);
  });

  // POST /sse — message endpoint for SSE transport (some clients POST to /mcp/sse?sessionId=...)
  fastify.post('/sse', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireApiKey(request, reply);
    if (reply.sent) return;
    const sessionId = (request.query as any)?.sessionId;
    if (!sessionId) return reply.status(400).send({ error: 'sessionId required' });
    const session = sessions.get(sessionId);
    if (!session) return reply.status(404).send({ error: 'Session not found' });
    if (!(session.transport instanceof SSEServerTransport)) return reply.status(400).send({ error: 'Not an SSE session' });
    await session.transport.handlePostMessage(request.raw, reply.raw, request.body);
  });

  fastify.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireApiKey(request, reply);
    if (reply.sent) return;

    const mcpSessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!mcpSessionId) {
      return reply.status(400).send({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'mcp-session-id header required' },
        id: null,
      });
    }

    const session = sessions.get(mcpSessionId);
    if (!session) {
      return reply.status(404).send({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session not found' },
        id: null,
      });
    }

    if (session.transport instanceof StreamableHTTPServerTransport) {
      await session.transport.handleRequest(request.raw, reply.raw);
      reply.hijack();
    } else {
      // Legacy SSE transport doesn't support DELETE, just clean up
      await session.transport.close?.();
      sessions.delete(mcpSessionId);
      return reply.status(200).send({ ok: true });
    }
  });
}
