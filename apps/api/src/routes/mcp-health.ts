import { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * MCP Connection Health Check API
 * 
 * GET /api/mcp/health-check?agentName=xxx
 *   Returns health status for a specific agent or all agents
 * 
 * Health states:
 *   connected    — last activity < 5 min
 *   degraded     — last activity 5–30 min
 *   disconnected — last activity > 30 min or no record
 *   unknown      — registered but never had activity
 */
export default async function mcpHealthRoutes(fastify: FastifyInstance) {
  fastify.get('/health-check', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply) => {
    const userId = request.user!.id;
    const { agentName } = request.query as { agentName?: string };

    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    const THIRTY_MIN = 30 * 60 * 1000;

    function computeHealth(conn: { lastActiveAt: Date | null; connectedAt: Date | null; status: string | null }) {
      const lastActive = conn.lastActiveAt ? new Date(conn.lastActiveAt).getTime() : null;

      if (!lastActive) {
        // Never had activity — check if just connected
        if (conn.connectedAt) {
          const connectedAge = now - new Date(conn.connectedAt).getTime();
          if (connectedAge < FIVE_MIN) return 'unknown'; // just registered
        }
        return 'disconnected';
      }

      const age = now - lastActive;
      if (age < FIVE_MIN) return 'connected';
      if (age <= THIRTY_MIN) return 'degraded';
      return 'disconnected';
    }

    // Build query conditions
    const conditions = [eq(schema.agentConnections.userId, userId)];
    if (agentName) {
      conditions.push(eq(schema.agentConnections.agentName, agentName));
    }

    const connections = await db.select({
      agentName: schema.agentConnections.agentName,
      status: schema.agentConnections.status,
      transport: schema.agentConnections.transport,
      connectedAt: schema.agentConnections.connectedAt,
      lastActiveAt: schema.agentConnections.lastActiveAt,
      disconnectedAt: schema.agentConnections.disconnectedAt,
    })
      .from(schema.agentConnections)
      .where(and(...conditions))
      .orderBy(desc(schema.agentConnections.lastActiveAt));

    // Group by agent name — pick latest connection per agent
    const agentMap = new Map<string, (typeof connections)[0]>();
    for (const conn of connections) {
      const name = conn.agentName || 'unknown';
      if (!agentMap.has(name)) agentMap.set(name, conn);
    }

    const results = [...agentMap.entries()].map(([name, conn]) => ({
      name,
      health: computeHealth(conn),
      transport: conn.transport,
      lastActiveAt: conn.lastActiveAt,
      connectedAt: conn.connectedAt,
      disconnectedAt: conn.disconnectedAt,
      checkedAt: new Date().toISOString(),
    }));

    if (agentName) {
      const agent = results[0];
      if (!agent) {
        return reply.send({ health: 'disconnected', name: agentName, checkedAt: new Date().toISOString() });
      }
      return reply.send(agent);
    }

    return reply.send({ agents: results });
  });
}
