-- =============================================================================
-- FileMind: System Optimization Database Setup (PDF Optimization & Metadata)
-- Migration: supabase_optimization_setup.sql
-- =============================================================================

-- 1. Add optimization columns to public.documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS original_file_size bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS optimization_status text DEFAULT NULL
    CHECK (optimization_status IS NULL OR optimization_status IN ('pending', 'processing', 'completed', 'unchanged', 'skipped', 'failed')),
  ADD COLUMN IF NOT EXISTS optimization_saved_bytes bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS optimization_savings_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS optimization_error text DEFAULT NULL;

-- 2. Create index for fast quota & status lookups
CREATE INDEX IF NOT EXISTS documents_user_opt_status_idx 
  ON public.documents(user_id, optimization_status);

-- 3. Atomic, secure RPC for canonical storage switch and size update
-- Only callable by service_role
CREATE OR REPLACE FUNCTION public.update_document_optimized_size(
  p_document_id uuid,
  p_user_id uuid,
  p_expected_storage_path text,
  p_new_storage_path text,
  p_optimized_size bigint,
  p_original_size bigint,
  p_saved_bytes bigint,
  p_savings_percent numeric,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $BODY$
DECLARE
  v_current_path text;
  v_current_user uuid;
BEGIN
  -- 1. Authoritative check: document must exist, belong to p_user_id, and have storage_path = p_expected_storage_path
  SELECT storage_path, user_id
    INTO v_current_path, v_current_user
    FROM public.documents
   WHERE id = p_document_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_current_user != p_user_id THEN
    RETURN false;
  END IF;

  -- Race condition fence: if storage_path is not what was expected, do not overwrite!
  IF v_current_path != p_expected_storage_path THEN
    RETURN false;
  END IF;

  -- 2. Verify new path belongs to user's namespace
  IF pg_catalog.split_part(p_new_storage_path, '/', 1) != p_user_id::text THEN
    RAISE EXCEPTION 'Unauthorized: new storage_path must reside within user namespace';
  END IF;

  -- 3. Atomic update
  UPDATE public.documents
     SET storage_path = p_new_storage_path,
         file_size = p_optimized_size,
         original_file_size = p_original_size,
         optimization_saved_bytes = p_saved_bytes,
         optimization_savings_percent = p_savings_percent,
         optimization_status = p_status,
         updated_at = pg_catalog.now()
   WHERE id = p_document_id;

  RETURN true;
END;
$BODY$;

-- 4. Strictly lock down RPC permissions to service_role only
REVOKE ALL ON FUNCTION public.update_document_optimized_size(uuid, uuid, text, text, bigint, bigint, bigint, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_document_optimized_size(uuid, uuid, text, text, bigint, bigint, bigint, numeric, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_document_optimized_size(uuid, uuid, text, text, bigint, bigint, bigint, numeric, text) TO service_role;
