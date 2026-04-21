-- Add is_sample flag to files for sample knowledge base feature
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_files_is_sample ON files(user_id, is_sample) WHERE is_sample = TRUE;
