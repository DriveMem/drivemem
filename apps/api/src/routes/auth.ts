import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, passwordResetTokens } from '../db/schema.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { config } from '../lib/config.js';

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

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
});

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /login — Auth.js Credentials provider 调用此端点验证密码
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

    // 返回用户信息（不含 passwordHash），Auth.js authorize 函数用这个签 JWT
    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
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
      await transporter.sendMail({
        from: config.SMTP_FROM,
        to: body.email,
        subject: 'Reset your password',
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    }

    return reply.send({ message: '如果邮箱已注册，重置链接已发送' });
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
