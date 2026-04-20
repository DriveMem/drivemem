-- Add type and user_agent columns to feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'suggestion';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_agent text;
