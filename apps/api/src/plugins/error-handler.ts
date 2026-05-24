import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { config } from '../lib/config.js';

const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: unknown, _request, reply) => {
    // AppError — known application errors
    if (error instanceof AppError) {
      return reply.status(error.status).send({
        error: {
          code: error.code,
          message: error.message,
          status: error.status,
        },
      });
    }

    // ZodError — validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          status: 400,
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    // Fastify built-in errors (e.g. JSON parse failure, content-type issues)
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as any).statusCode || 400;
      return reply.status(statusCode).send({
        error: {
          code: 'REQUEST_ERROR',
          message: error.message,
          status: statusCode,
        },
      });
    }

    // Unknown errors
    fastify.log.error(error);
    const isDev = config.NODE_ENV === 'development';
    const message = error instanceof Error ? error.message : 'Internal server error';
    const stack = error instanceof Error ? error.stack : undefined;
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: isDev ? message : 'Internal server error',
        status: 500,
        ...(isDev && { stack }),
      },
    });
  });
};

export default fp(errorHandler, { name: 'error-handler' });
