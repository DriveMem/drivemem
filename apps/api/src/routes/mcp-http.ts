import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { createMcpServer } from '../mcp/create-server.js';

export default async function mcpHttpRoutes(fastify: FastifyInstance) {
  // Active sessions: sessionId -> { transport, server }
  const sessions = new Map<string, { transport: SSEServerTransport | StreamableHTTPServerTransport; server: any }>();

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
      await session.transport.handleRequest(request.raw, reply.raw, request.body);
      reply.hijack();
      return;
    }

    // --- Streamable HTTP: new session (initialize request) ---
    if (isInitializeRequest(request.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId: string) => {
          sessions.set(sessionId, { transport, server: mcpServer });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) sessions.delete(sid);
      };

      const mcpServer = createMcpServer(userId, agentName);
      await mcpServer.connect(transport);
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

    const mcpServer = createMcpServer(userId, agentName);
    const transport = new SSEServerTransport('/mcp', reply.raw);

    const sessionId = (transport as any)._sessionId as string;
    sessions.set(sessionId, { transport, server: mcpServer });

    transport.onclose = () => {
      sessions.delete(sessionId);
    };

    await mcpServer.connect(transport);
    reply.hijack();
  });

  // DELETE / — Streamable HTTP session termination
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
