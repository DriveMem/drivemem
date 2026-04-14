import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { compileContext } from '../services/context-compiler/index.js';

const compileSchema = z.object({
  task: z.string().min(1).max(10000),
  model: z.object({
    name: z.string().optional(),
    contextWindow: z.number().optional(),
  }).optional(),
  tokenBudget: z.number().int().min(500).max(100000).optional(),
  hints: z.object({
    project: z.string().optional(),
    tags: z.array(z.string()).optional(),
    recency: z.string().optional(),
    folderId: z.string().uuid().optional(),
  }).optional(),
  format: z.literal('markdown').optional(),
});

export default async function contextCompilerRoutes(fastify: FastifyInstance) {
  // POST /context/compile
  fastify.post('/compile', { preHandler: [requireApiKey] }, async (request, reply) => {
    const body = compileSchema.parse(request.body);
    const userId = request.user!.id;

    const result = await compileContext(userId, {
      task: body.task,
      model: body.model,
      tokenBudget: body.tokenBudget,
      hints: body.hints,
      format: body.format,
    });

    return reply.send(result);
  });
}
