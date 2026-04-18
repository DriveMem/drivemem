import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_REGION: z.string().min(1),
  S3_ENDPOINT: z.string().optional(),
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.string().optional(),
  EMBEDDING_BASE_URL: z.string().optional(),
  EMBEDDING_MODEL: z.string().default("text-embedding-v3"),
  EMBEDDING_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  PORT: z.coerce.number().default(3001),
  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'moonshot']).default('openai'),
  LLM_MODEL: z.string().optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(2048),
  LLM_TEMPERATURE: z.coerce.number().default(0.7),
  ANTHROPIC_API_KEY: z.string().optional(),
  CHAT_CONTEXT_ROUNDS: z.coerce.number().default(5),
  DAILY_CHAT_LIMIT: z.coerce.number().default(50),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NOTION_CLIENT_ID: z.string().optional(),
  NOTION_CLIENT_SECRET: z.string().optional(),
  GITHUB_INTEGRATION_CLIENT_ID: z.string().optional(),
  GITHUB_INTEGRATION_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const config = envSchema.parse(process.env);
