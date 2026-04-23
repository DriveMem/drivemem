#!/bin/bash
# Auto-sync DB schema — run after code deploy to ensure all columns/tables exist
# This is idempotent — safe to run multiple times
set -e

DB_CMD="${DB_CMD:-psql -h localhost -U aidrive -d aidrive}"

echo "[db-sync] Syncing schema..."

$DB_CMD <<'SQL'
-- tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- files
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

-- nudge_state
CREATE TABLE IF NOT EXISTS nudge_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_upload_at TIMESTAMPTZ,
  chat_first_at TIMESTAMPTZ,
  mcp_connect_at TIMESTAMPTZ,
  nudge_d0_sent_at TIMESTAMPTZ,
  nudge_d1_sent_at TIMESTAMPTZ,
  nudge_d3_sent_at TIMESTAMPTZ,
  nudge_d7_sent_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  unsubscribed_email BOOLEAN NOT NULL DEFAULT false,
  unsubscribe_token VARCHAR(64) DEFAULT 'pending',
  last_email_sent_date VARCHAR(10),
  last_notification_sent_date VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS chat_first_at TIMESTAMPTZ;
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS nudge_d0_sent_at TIMESTAMPTZ;
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS nudge_d1_sent_at TIMESTAMPTZ;
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS nudge_d3_sent_at TIMESTAMPTZ;
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS nudge_d7_sent_at TIMESTAMPTZ;
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS unsubscribed_email BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(64) DEFAULT 'pending';
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS last_email_sent_date VARCHAR(10);
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS last_notification_sent_date VARCHAR(10);
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE nudge_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add unique constraint if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nudge_state_user_id_unique') THEN
    ALTER TABLE nudge_state ADD CONSTRAINT nudge_state_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- pgcrypto for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

SQL

echo "[db-sync] ✅ Schema sync complete"
