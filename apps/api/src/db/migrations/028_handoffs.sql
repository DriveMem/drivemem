<<<<<<< HEAD
=======
-- Phase 2: Handoff Engine
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
CREATE TYPE handoff_status AS ENUM ('draft','sent','received','request_more','supplementing','accepted','rejected','expired');

CREATE TABLE handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id uuid NOT NULL REFERENCES users(id),
  status handoff_status NOT NULL DEFAULT 'draft',
  context_pack jsonb NOT NULL DEFAULT '{}',
  supplement_requests jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours')
);

CREATE INDEX idx_handoffs_workspace ON handoffs(workspace_id);
CREATE INDEX idx_handoffs_to_user ON handoffs(to_user_id);
CREATE INDEX idx_handoffs_from_user ON handoffs(from_user_id);
CREATE INDEX idx_handoffs_status ON handoffs(status);
<<<<<<< HEAD
=======

-- Add webhook_url to users for handoff notifications
ALTER TABLE users ADD COLUMN webhook_url text;
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
