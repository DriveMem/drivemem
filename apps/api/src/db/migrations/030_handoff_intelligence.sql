ALTER TABLE handoffs ADD COLUMN auto_supplement_count integer NOT NULL DEFAULT 0;
ALTER TABLE handoffs ADD COLUMN quality_score integer;
ALTER TABLE handoffs ADD COLUMN quality_warning text;
