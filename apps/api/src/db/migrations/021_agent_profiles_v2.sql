-- Agent Profiles v2: structured capabilities, context rules, API key binding
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS capabilities JSONB;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS preferences JSONB;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS context_rules JSONB;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Index for fast lookup by API key
CREATE INDEX IF NOT EXISTS idx_agent_profiles_api_key_id ON agent_profiles(api_key_id) WHERE api_key_id IS NOT NULL;
