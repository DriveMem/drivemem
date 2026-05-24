-- Workspace role enum
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Workspaces table
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workspace members
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Add workspace_id to files (nullable = personal space)
ALTER TABLE files ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX idx_files_workspace ON files(workspace_id);

-- Add workspace_id to search_chunks
ALTER TABLE search_chunks ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX idx_search_chunks_workspace ON search_chunks(workspace_id);
