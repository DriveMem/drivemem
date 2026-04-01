import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  authProvider: z.string(),
  storageUsed: z.number(),
  storageLimit: z.number(),
  dailyChatCount: z.number(),
  dailyChatLimit: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;
