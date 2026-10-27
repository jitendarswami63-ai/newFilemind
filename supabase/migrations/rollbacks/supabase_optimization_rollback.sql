-- =============================================================================
-- FileMind: PHASE OPTIMIZATION ROLLBACK ONLY
-- File: supabase_optimization_rollback.sql
-- =============================================================================
-- WARNING: This script reverts ONLY Phase Optimization changes.
-- It strictly preserves all Phase 0, Phase 1A, and Phase 1B tables, columns,
-- triggers, indexes, and RPC functions (documents, document_pages, document_chunks,
-- pgvector, HNSW indexes, RRF search, etc.).
--
-- Note: If a versioned optimized storage file exists, ensure the document
-- canonical storage_path is pointing to an existing file before dropping columns.
-- =============================================================================

-- 1. Drop the optimization RPC
DROP FUNCTION IF EXISTS public.update_document_optimized_size(uuid, uuid, text, text, bigint, bigint, bigint, numeric, text);

-- 2. Drop the optimization index
DROP INDEX IF EXISTS public.documents_user_opt_status_idx;

-- 3. Drop optimization-specific columns from public.documents
ALTER TABLE public.documents
  DROP COLUMN IF EXISTS original_file_size,
  DROP COLUMN IF EXISTS optimization_status,
  DROP COLUMN IF EXISTS optimization_saved_bytes,
  DROP COLUMN IF EXISTS optimization_savings_percent,
  DROP COLUMN IF EXISTS optimization_error;
