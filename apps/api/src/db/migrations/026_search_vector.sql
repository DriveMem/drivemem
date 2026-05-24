-- Add search_chunks table for PostgreSQL full-text search (BM25-style ranking)
CREATE TABLE IF NOT EXISTS search_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_search_chunks_vector ON search_chunks USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_search_chunks_user_id ON search_chunks (user_id);
CREATE INDEX IF NOT EXISTS idx_search_chunks_file_id ON search_chunks (file_id);

-- Add search_vector column to files table for filename/summary search
ALTER TABLE files ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_files_search_vector ON files USING GIN (search_vector);

-- Trigger to auto-update files.search_vector on insert/update
CREATE OR REPLACE FUNCTION files_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.original_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.summary, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_files_search_vector ON files;
CREATE TRIGGER trg_files_search_vector
  BEFORE INSERT OR UPDATE OF name, original_name, summary ON files
  FOR EACH ROW EXECUTE FUNCTION files_search_vector_update();

-- Trigger to auto-update search_chunks.search_vector
CREATE OR REPLACE FUNCTION search_chunks_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_search_chunks_vector ON search_chunks;
CREATE TRIGGER trg_search_chunks_vector
  BEFORE INSERT OR UPDATE OF content ON search_chunks
  FOR EACH ROW EXECUTE FUNCTION search_chunks_vector_update();
