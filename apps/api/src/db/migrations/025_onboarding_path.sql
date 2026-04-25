-- Add onboarding_path column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_path VARCHAR(50);
