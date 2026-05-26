-- Migration 046: Resize embedding columns from vector(1536) to vector(768)
-- for Google gemini-embedding-001 (3072 native, truncated to 768 via
-- Matryoshka — first N dims are self-contained). pgvector indexes cap
-- at 2000 dims, so truncation is required.
--
-- Drop the old IVFFlat index and recreate as HNSW (faster, no training).

DROP INDEX IF EXISTS public.items_embedding_idx;

ALTER TABLE public.items
  ALTER COLUMN embedding TYPE vector(768);

ALTER TABLE public.users
  ALTER COLUMN embedding TYPE vector(768);

ALTER TABLE analytics.user_embeddings
  ALTER COLUMN embedding TYPE vector(768);

ALTER TABLE analytics.item_embeddings
  ALTER COLUMN embedding TYPE vector(768);

CREATE INDEX items_embedding_idx ON public.items
  USING hnsw (embedding vector_cosine_ops);
