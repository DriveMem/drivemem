import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { SignJWT } from 'jose';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, passwordResetTokens } from '../db/schema.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { config } from '../lib/config.js';
import { seedDemoProject } from '../services/demo-seed.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(100),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const resend = new Resend(process.env.RESEND_API_KEY || '');

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid email or password', 401);
    }

    // Sign a plain JWT for the frontend to use in API calls
    const jwtSecret = new TextEncoder().encode(config.JWT_SECRET);
    const rememberMe = (request.body as any)?.rememberMe === true;
    const token = await new SignJWT({ sub: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(rememberMe ? '30d' : '7d')
      .sign(jwtSecret);

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      token,
    });
  });

  // POST /signup
  fastify.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError('EMAIL_EXISTS', 'Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        passwordHash,
        authProvider: 'credentials',
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    // Fire-and-forget: seed sample files for the new user
    seedDemoProject(user.id).catch(() => {});

    // Fire-and-forget: initialize nudge state for activation sequence
    import('../services/nudge.service.js').then(({ ensureNudgeState }) => {
      ensureNudgeState(user.id).catch(() => {});
    }).catch(() => {});

    return reply.status(201).send(user);
  });

  // POST /forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      const resetLink = `${config.FRONTEND_URL}/reset-password?token=${token}`;
      await resend.emails.send({
        from: 'AI Drive <noreply@drivemem.cloud>',
        to: body.email,
        subject: 'Reset your password - AI Drive',
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    }

    return reply.send({ message: 'If the email is registered, a reset link has been sent' });
  });

  // POST /reset-password
  fastify.post('/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, body.token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      throw new AppError('INVALID_TOKEN', 'Token is invalid or expired', 400);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, record.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    return reply.send({ message: '密码已重置' });
  });
}
