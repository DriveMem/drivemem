import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { createMcpServer } from '../mcp/create-server.js';

export default async function mcpHttpRoutes(fastify: FastifyInstance) {
  // Active SSE sessions: sessionId -> { transport, server }
  const sessions = new Map<string, { transport: SSEServerTransport; server: any }>();

  // GET /mcp — SSE connection endpoint
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate via API Key
    await requireApiKey(request, reply);
    if (reply.sent) return;

    const userId = request.user!.id;

    // Create per-session MCP server + transport
    const mcpServer = createMcpServer(userId);
    // SSEServerTransport: constructor(endpoint, res) — endpoint is the POST path relative to SSE
    const transport = new SSEServerTransport('/mcp', reply.raw);

    const sessionId = (transport as any)._sessionId as string;
    sessions.set(sessionId, { transport, server: mcpServer });

    transport.onclose = () => {
      sessions.delete(sessionId);
    };

    // connect() calls transport.start() internally which writes SSE headers and endpoint event
    await mcpServer.connect(transport);

    // The response is now an SSE stream — prevent Fastify from closing it
    // reply.raw is already being written to by the transport
    // We must NOT call reply.send() — mark as hijacked
    reply.hijack();
  });

  // POST /mcp — message endpoint (client sends JSON-RPC messages here)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate via API Key
    await requireApiKey(request, reply);
    if (reply.sent) return;

    const sessionId = (request.query as any)?.sessionId;
    if (!sessionId) {
      return reply.status(400).send({ error: 'sessionId query parameter required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found. Establish SSE connection first.' });
    }

    // handlePostMessage reads the body from req and writes response to res
    // Pass parsed body to avoid double-reading (Fastify already parsed it)
    await session.transport.handlePostMessage(request.raw, reply.raw, request.body);

    // handlePostMessage already wrote the response
    reply.hijack();
  });
}
