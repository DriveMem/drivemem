import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';

const updateProfileSchema = z.object({
  name: z.string().max(100),
});

export default async function userRoutes(fastify: FastifyInstance) {
  // GET /me
  fastify.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        authProvider: users.authProvider,
        storageUsed: users.storageUsed,
        storageLimit: users.storageLimit,
        dailyChatCount: users.dailyChatCount,
        dailyChatLimit: users.dailyChatLimit,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, request.user!.id))
      .limit(1);

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    return reply.send(user);
  });

  // PATCH /me
  fastify.patch('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);

    const [user] = await db
      .update(users)
      .set({ name: body.name, updatedAt: new Date() })
      .where(eq(users.id, request.user!.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        authProvider: users.authProvider,
        storageUsed: users.storageUsed,
        storageLimit: users.storageLimit,
        dailyChatCount: users.dailyChatCount,
        dailyChatLimit: users.dailyChatLimit,
        createdAt: users.createdAt,
      });

    return reply.send(user);
  });
}
