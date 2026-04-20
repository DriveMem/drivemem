-- Activation Nudge State table
CREATE TABLE IF NOT EXISTS nudge_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Core action timestamps
  file_upload_at TIMESTAMPTZ,
  chat_first_at TIMESTAMPTZ,
  mcp_connect_at TIMESTAMPTZ,
  -- Nudge sent timestamps
  nudge_d0_sent_at TIMESTAMPTZ,
  nudge_d1_sent_at TIMESTAMPTZ,
  nudge_d3_sent_at TIMESTAMPTZ,
  nudge_d7_sent_at TIMESTAMPTZ,
  -- Status
  activated_at TIMESTAMPTZ,
  unsubscribed_email BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribe_token VARCHAR(64) NOT NULL,
  last_email_sent_date DATE,
  last_notification_sent_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_nudge_state_user_id ON nudge_state(user_id);
CREATE INDEX idx_nudge_state_unsubscribe_token ON nudge_state(unsubscribe_token);
