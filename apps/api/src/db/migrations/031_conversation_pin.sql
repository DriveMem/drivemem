ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(user_id, pinned_at DESC NULLS LAST);
