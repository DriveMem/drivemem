import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().min(1).max(20),
});

const addTagSchema = z.object({
  tagId: z.string().uuid(),
});

export default async function tagRoutes(app: FastifyInstance) {
  // GET /api/tags — list user tags
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const tagList = await db.select().from(schema.tags).where(eq(schema.tags.userId, userId));
    return reply.send(tagList);
  });

  // POST /api/tags — create tag
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = createTagSchema.parse(request.body);
    const [tag] = await db.insert(schema.tags).values({ name: body.name, color: body.color, userId }).returning();
    return reply.status(201).send(tag);
  });

  // DELETE /api/tags/:id — delete tag
  app.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const [tag] = await db.select().from(schema.tags).where(and(eq(schema.tags.id, id), eq(schema.tags.userId, userId)));
    if (!tag) throw new AppError(ErrorCodes.NOT_FOUND, 'Tag not found', 404);
    await db.delete(schema.fileTags).where(eq(schema.fileTags.tagId, id));
    await db.delete(schema.tags).where(eq(schema.tags.id, id));
    return reply.status(204).send();
  });

  // POST /api/tags/file/:fileId — add tag to file
  app.post('/file/:fileId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const userId = request.user!.id;
    const body = addTagSchema.parse(request.body);

    // Verify file ownership
    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, fileId), eq(schema.files.userId, userId)));
    if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);

    // Verify tag ownership
    const [tag] = await db.select().from(schema.tags).where(and(eq(schema.tags.id, body.tagId), eq(schema.tags.userId, userId)));
    if (!tag) throw new AppError(ErrorCodes.NOT_FOUND, 'Tag not found', 404);

    // Check if already exists
    const [existing] = await db.select().from(schema.fileTags).where(and(eq(schema.fileTags.fileId, fileId), eq(schema.fileTags.tagId, body.tagId)));
    if (!existing) {
      await db.insert(schema.fileTags).values({ fileId, tagId: body.tagId });
    }
    return reply.send({ success: true });
  });

  // DELETE /api/tags/file/:fileId/:tagId — remove tag from file
  app.delete('/file/:fileId/:tagId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { fileId, tagId } = request.params as { fileId: string; tagId: string };
    await db.delete(schema.fileTags).where(and(eq(schema.fileTags.fileId, fileId), eq(schema.fileTags.tagId, tagId)));
    return reply.status(204).send();
  });

  // GET /api/tags/file/:fileId — get tags for a file
  app.get('/file/:fileId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const result = await db.select({ tag: schema.tags }).from(schema.fileTags)
      .innerJoin(schema.tags, eq(schema.fileTags.tagId, schema.tags.id))
      .where(eq(schema.fileTags.fileId, fileId));
    return reply.send(result.map(r => r.tag));
  });

  // GET /api/tags/:tagId/files — get file IDs for a tag
  app.get('/:tagId/files', { preHandler: [requireAuth] }, async (request, reply) => {
    const { tagId } = request.params as { tagId: string };
    const result = await db.select({ fileId: schema.fileTags.fileId }).from(schema.fileTags).where(eq(schema.fileTags.tagId, tagId));
    return reply.send(result.map(r => r.fileId));
  });
}
