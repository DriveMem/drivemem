ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "permission" text DEFAULT 'view' NOT NULL;
