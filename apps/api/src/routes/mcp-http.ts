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
  // Active sessions: sessionId -> session metadata
  // SSE sessions are kept alive for SESSION_TTL_MS after disconnect to allow reconnection
  const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

  interface SessionEntry {
    transport: SSEServerTransport | StreamableHTTPServerTransport;
    server: any;
    userId: string;
    agentName: string;
    apiKeyId?: string;
    connectionId: string | null;
    disconnectedAt?: number; // timestamp when SSE closed (undefined = still connected)
  }

  const sessions = new Map<string, SessionEntry>();

  // Cleanup interval: remove SSE sessions that have been disconnected > TTL
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.disconnectedAt && (now - session.disconnectedAt) > SESSION_TTL_MS) {
        sessions.delete(id);
        trackConnectionClose(session.connectionId);
      }
    }
  }, 60_000);

  fastify.addHook('onClose', () => {
    clearInterval(cleanupInterval);
    for (const [id, session] of sessions) {
      trackConnectionClose(session.connectionId);
    }
    sessions.clear();
  });

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
    // Check for legacy SSE sessionId — skip auth if valid session (already authed on GET)
    const legacySessionId = (request.query as any)?.sessionId as string | undefined;
    if (legacySessionId) {
      const session = sessions.get(legacySessionId);
      if (!session || session.disconnectedAt) {
        return reply.status(404).send({ error: 'Session not found or disconnected. Establish SSE connection first.' });
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

    await requireApiKey(request, reply);
    if (reply.sent) return;

    const userId = request.user!.id;
    const agentName = (request as any).apiKeyName || '';

    // Check for Streamable HTTP session header
    const mcpSessionId = request.headers['mcp-session-id'] as string | undefined;

    if (mcpSessionId) {
      // --- Streamable HTTP: subsequent request with existing session ---
      let session = sessions.get(mcpSessionId);
      if (!session && isInitializeRequest(request.body)) {
        // Session expired (server restart?) — auto-rebuild with same session ID
        console.log(`[MCP] Session ${mcpSessionId} expired, auto-rebuilding with initialize...`);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => mcpSessionId,
          onsessioninitialized: (sessionId: string) => {
            sessions.set(sessionId, { transport, server: mcpServer, userId, agentName, apiKeyId: (request as any).apiKeyId, connectionId: null });
          },
        });
        let connectionId: string | null = null;
        transport.onclose = () => {
          onSessionDisconnect(mcpSessionId);
          sessions.delete(mcpSessionId);
          trackConnectionClose(connectionId);
        };
        const mcpServer = createMcpServer(userId, agentName, {
          apiKeyId: (request as any).apiKeyId,
          onToolCall: (toolName, toolArgs) => {
            trackToolCall(mcpSessionId, userId, agentName, toolName, toolArgs);
            trackConnectionActivity(connectionId);
          },
        });
        await mcpServer.connect(transport);
        trackConnectionOpen(userId, (request as any).apiKeyId, agentName, 'streamable-http-reconnect').then(id => {
          connectionId = id;
          const s = sessions.get(mcpSessionId);
          if (s) s.connectionId = id;
        });
        await transport.handleRequest(request.raw, reply.raw, request.body);
        reply.hijack();
        return;
      } else if (!session) {
        return reply.status(404).send({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session expired. Send an initialize request with the same session ID to reconnect.' },
          id: null,
        });
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
          sessions.set(sessionId, { transport, server: mcpServer, userId, agentName, apiKeyId: (request as any).apiKeyId, connectionId: null });
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
      trackConnectionOpen(userId, (request as any).apiKeyId, agentName, 'streamable-http').then(id => {
        connectionId = id;
        const sid = transport.sessionId;
        if (sid) { const s = sessions.get(sid); if (s) s.connectionId = id; }
      });
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
      // Keepalive for Streamable HTTP SSE stream
      const shKeep = setInterval(() => {
        try { reply.raw.write(': keepalive\n\n'); } catch { clearInterval(shKeep); }
      }, 15000);
      reply.raw.on('close', () => clearInterval(shKeep));
      await session.transport.handleRequest(request.raw, reply.raw);
      reply.hijack();
      return;
    }

    // --- Legacy SSE: establish new or reconnect existing SSE connection ---
    const userId = request.user!.id;
    const agentName = (request as any).apiKeyName || '';
    const reconnectSessionId = (request.query as any)?.sessionId as string | undefined;

    // Check for reconnection to an existing disconnected session
    if (reconnectSessionId) {
      const existing = sessions.get(reconnectSessionId);
      if (existing && existing.disconnectedAt && existing.userId === userId && existing.agentName === agentName) {
        // Reconnect: reuse MCP server, create new SSE transport
        const newTransport = new SSEServerTransport('/mcp', reply.raw);
        const newSessionId = (newTransport as any)._sessionId as string;

        const keepalive = setInterval(() => {
          try { reply.raw.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
        }, 15000);

        // Remove old session entry, create new one with same server
        sessions.delete(reconnectSessionId);
        sessions.set(newSessionId, {
          transport: newTransport,
          server: existing.server,
          userId,
          agentName,
          apiKeyId: existing.apiKeyId,
          connectionId: existing.connectionId,
          disconnectedAt: undefined,
        });

        newTransport.onclose = () => {
          clearInterval(keepalive);
          const sess = sessions.get(newSessionId);
          if (sess) {
            sess.disconnectedAt = Date.now();
            onSessionDisconnect(newSessionId);
          }
        };

        reply.raw.on('close', () => {
          clearInterval(keepalive);
          const sess = sessions.get(newSessionId);
          if (sess && !sess.disconnectedAt) {
            sess.disconnectedAt = Date.now();
            onSessionDisconnect(newSessionId);
          }
        });

        await existing.server.connect(newTransport);
        trackConnectionOpen(userId, existing.apiKeyId, agentName, 'sse-reconnect').then(id => {
          const sess = sessions.get(newSessionId);
          if (sess) sess.connectionId = id;
        });
        console.log(`[MCP] SSE reconnected: old=${reconnectSessionId} new=${newSessionId}`);
        reply.hijack();
        return;
      }
      // If session not found or not disconnected, fall through to create new session
    }

    // --- New SSE session ---
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
    sessions.set(sessionId, {
      transport,
      server: mcpServer,
      userId,
      agentName,
      apiKeyId: (request as any).apiKeyId,
      connectionId: sseConnectionId,
    });

    transport.onclose = () => {
      clearInterval(keepalive);
      // Soft-delete: mark disconnected instead of removing, allows reconnection within TTL
      const sess = sessions.get(sessionId);
      if (sess) {
        sess.disconnectedAt = Date.now();
        onSessionDisconnect(sessionId);
      }
    };

    reply.raw.on('close', () => {
      clearInterval(keepalive);
      const sess = sessions.get(sessionId);
      if (sess && !sess.disconnectedAt) {
        sess.disconnectedAt = Date.now();
        onSessionDisconnect(sessionId);
      }
    });

    await mcpServer.connect(transport);
    trackConnectionOpen(userId, (request as any).apiKeyId, agentName, 'sse').then(id => {
      sseConnectionId = id;
      const sess = sessions.get(sessionId);
      if (sess) sess.connectionId = id;
    });
    reply.hijack();
  });

  // DELETE / — Streamable HTTP session termination
  // GET /sse — alias for SSE endpoint (some clients use /mcp/sse instead of /mcp)
  fastify.get('/sse', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireApiKey(request, reply);
    if (reply.sent) return;
    const userId = request.user!.id;
    const agentName = (request as any).apiKeyName || '';
    const apiKeyId = (request as any).apiKeyId;
    const reconnectSessionId = (request.query as any)?.sessionId as string | undefined;

    // Check for reconnection to an existing disconnected session
    if (reconnectSessionId) {
      const existing = sessions.get(reconnectSessionId);
      if (existing && existing.disconnectedAt && existing.userId === userId && existing.agentName === agentName) {
        const newTransport = new SSEServerTransport('/mcp/sse', reply.raw);
        const newSessionId = newTransport.sessionId;

        const keepalive = setInterval(() => {
          try { reply.raw.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
        }, 15000);

        sessions.delete(reconnectSessionId);
        sessions.set(newSessionId, {
          transport: newTransport,
          server: existing.server,
          userId,
          agentName,
          apiKeyId: existing.apiKeyId,
          connectionId: existing.connectionId,
          disconnectedAt: undefined,
        });

        newTransport.onclose = () => {
          clearInterval(keepalive);
          const sess = sessions.get(newSessionId);
          if (sess) {
            sess.disconnectedAt = Date.now();
            onSessionDisconnect(newSessionId);
          }
        };

        reply.raw.on('close', () => {
          clearInterval(keepalive);
          const sess = sessions.get(newSessionId);
          if (sess && !sess.disconnectedAt) {
            sess.disconnectedAt = Date.now();
            onSessionDisconnect(newSessionId);
          }
        });

        await existing.server.connect(newTransport);
        trackConnectionOpen(userId, existing.apiKeyId, agentName, 'sse-reconnect').then(id => {
          const sess = sessions.get(newSessionId);
          if (sess) sess.connectionId = id;
        });
        console.log(`[MCP] SSE /sse reconnected: old=${reconnectSessionId} new=${newSessionId}`);
        reply.hijack();
        return;
      }
    }

    // --- New SSE session ---
    let sseConnectionId: string | null = null;
    const mcpServer = createMcpServer(userId, agentName, {
      apiKeyId,
      onToolCall: (toolName, toolArgs) => {
        trackToolCall(sessionId, userId, agentName, toolName, toolArgs);
        trackConnectionActivity(sseConnectionId);
      },
    });
    const transport = new SSEServerTransport('/mcp/sse', reply.raw);

    const keepalive = setInterval(() => {
      try { reply.raw.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
    }, 15000);

    const sessionId = transport.sessionId;
    sessions.set(sessionId, {
      transport,
      server: mcpServer,
      userId,
      agentName,
      apiKeyId,
      connectionId: sseConnectionId,
    });

    transport.onclose = () => {
      clearInterval(keepalive);
      const sess = sessions.get(sessionId);
      if (sess) {
        sess.disconnectedAt = Date.now();
        onSessionDisconnect(sessionId);
      }
    };

    reply.raw.on('close', () => {
      clearInterval(keepalive);
      const sess = sessions.get(sessionId);
      if (sess && !sess.disconnectedAt) {
        sess.disconnectedAt = Date.now();
        onSessionDisconnect(sessionId);
      }
    });

    await mcpServer.connect(transport);
    trackConnectionOpen(userId, apiKeyId, agentName, 'sse').then(id => {
      sseConnectionId = id;
      const sess = sessions.get(sessionId);
      if (sess) sess.connectionId = id;
    });
    reply.hijack();
  });

  // POST /sse — message endpoint for SSE transport (some clients POST to /mcp/sse?sessionId=...)
  fastify.post('/sse', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = (request.query as any)?.sessionId;
    
    // If sessionId provided, skip API key auth (already authenticated on SSE GET)
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session || session.disconnectedAt) return reply.status(404).send({ error: 'Session not found or disconnected' });
      if (!(session.transport instanceof SSEServerTransport)) return reply.status(400).send({ error: 'Not an SSE session' });
      await session.transport.handlePostMessage(request.raw, reply.raw, request.body);
      return;
    }
    
    // No sessionId — require API key auth
    await requireApiKey(request, reply);
    if (reply.sent) return;
    
    // mcp-remote http-first: return error to fall back to SSE
    return reply.status(400).send({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Use SSE transport: connect via GET to this endpoint first' },
      id: null,
    });
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
      trackConnectionClose(session.connectionId);
      return reply.status(200).send({ ok: true });
    }
  });
}
