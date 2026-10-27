-- ==============================================================================
-- FileMind Phase 1B ROLLBACK ONLY
-- Reverses exclusively Phase 1B objects without touching Phase 0 or Phase 1A.
-- ==============================================================================

-- 1. Drop Phase 1B Search RPCs
DROP FUNCTION IF EXISTS public.search_document_chunks_lexical(text, integer, uuid);
DROP FUNCTION IF EXISTS public.match_document_chunks(public.vector, integer, real, uuid);

-- 2. Drop Phase 1B Indexing RPCs
DROP FUNCTION IF EXISTS public.mark_document_indexing_failed(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.finalize_document_indexing(uuid, uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.acquire_document_indexing(uuid, uuid);

-- 3. Drop document_chunks table (cascades to its indexes and policies)
DROP TABLE IF EXISTS public.document_chunks CASCADE;

-- 4. Remove Phase 1B embedding lifecycle columns from public.documents
DROP INDEX IF EXISTS public.documents_user_embedding_status_idx;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS embedding_token,
  DROP COLUMN IF EXISTS embedding_locked_at,
  DROP COLUMN IF EXISTS embedding_completed_at,
  DROP COLUMN IF EXISTS embedding_started_at,
  DROP COLUMN IF EXISTS embedding_error,
  DROP COLUMN IF EXISTS embedding_attempts,
  DROP COLUMN IF EXISTS embedding_status;

-- 5. Optional: drop pgvector extension ONLY if no other feature or table depends on it
-- DROP EXTENSION IF EXISTS vector;
