-- ==============================================================================
-- FileMind Phase 1A Database Migration: AI Document Understanding
-- ==============================================================================

-- Step 1: Add fencing token to public.documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS processing_token uuid;

-- Step 2: Create public.document_pages table
CREATE TABLE IF NOT EXISTS public.document_pages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number     integer     NOT NULL,
  extracted_text  text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, page_number)
);

CREATE INDEX IF NOT EXISTS document_pages_document_id_idx 
  ON public.document_pages(document_id);

-- Step 3: Enable RLS on document_pages
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if re-running
DROP POLICY IF EXISTS "document_pages_select_own" ON public.document_pages;

-- SELECT: Authenticated users can read pages ONLY if they own the parent document
CREATE POLICY "document_pages_select_own" ON public.document_pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_pages.document_id AND d.user_id = auth.uid()
  ));

-- Step 4: Client mutation hardening and explicit permissions
REVOKE INSERT, UPDATE, DELETE ON public.document_pages FROM anon, authenticated;
REVOKE ALL ON public.document_pages FROM anon;
GRANT SELECT ON public.document_pages TO authenticated;

-- Step 5: Protect AI-managed state on public.documents by revoking table-level UPDATE
REVOKE UPDATE ON public.documents FROM public, anon, authenticated;

-- Step 6: Atomic Acquisition RPC (Lease / Fencing Token)
CREATE OR REPLACE FUNCTION public.acquire_document_processing(
  p_document_id uuid,
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_token uuid;
BEGIN
  UPDATE public.documents
  SET status = 'processing', 
      processing_stage = 'starting', 
      processing_locked_at = pg_catalog.now(), 
      processing_attempts = processing_attempts + 1,
      processing_token = pg_catalog.gen_random_uuid()
  WHERE id = p_document_id 
    AND user_id = p_user_id 
    AND (
      status IN ('pending', 'failed') 
      OR (status = 'processing' AND processing_locked_at < pg_catalog.now() - interval '10 minutes')
    )
    AND processing_attempts < 3
  RETURNING processing_token INTO v_new_token;

  RETURN v_new_token; -- Returns NULL if 0 rows updated
END;
$$;

-- Lock down acquisition RPC permissions
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) TO service_role;

-- Step 7: Atomic Finalization RPC (Commit Results in One Transaction)
CREATE OR REPLACE FUNCTION public.finalize_document_processing(
  p_document_id uuid,
  p_user_id uuid,
  p_processing_token uuid,
  p_doc_category text,
  p_tags text[],
  p_metadata jsonb,
  p_pages jsonb,
  p_page_count integer,
  p_is_scanned boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 1. Fencing Check: Verify ownership and that the token is still current
  IF NOT EXISTS (
    SELECT 1 FROM public.documents 
    WHERE id = p_document_id AND user_id = p_user_id AND processing_token = p_processing_token
  ) THEN
    RETURN false; -- Token is stale, lease was stolen. Abort safely.
  END IF;

  -- 2. Clean previous partial writes (Idempotency)
  DELETE FROM public.document_pages WHERE document_id = p_document_id;

  -- 3. Insert new pages
  INSERT INTO public.document_pages (document_id, page_number, extracted_text)
  SELECT p_document_id, (page->>'page_number')::integer, page->>'text'
  FROM pg_catalog.jsonb_array_elements(p_pages) AS page;

  -- 4. Commit document metadata and clear token
  UPDATE public.documents
  SET status = 'completed',
      doc_category = p_doc_category,
      tags = p_tags,
      extracted_data = p_metadata,
      page_count = p_page_count,
      is_scanned = p_is_scanned,
      processing_token = null,
      updated_at = pg_catalog.now()
  WHERE id = p_document_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

-- Lock down finalization RPC permissions
REVOKE EXECUTE ON FUNCTION public.finalize_document_processing(
  uuid, uuid, uuid, text, text[], jsonb, jsonb, integer, boolean
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.finalize_document_processing(
  uuid, uuid, uuid, text, text[], jsonb, jsonb, integer, boolean
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.finalize_document_processing(
  uuid, uuid, uuid, text, text[], jsonb, jsonb, integer, boolean
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_document_processing(
  uuid, uuid, uuid, text, text[], jsonb, jsonb, integer, boolean
) TO service_role;

-- Step 8: Fenced Failure RPC
CREATE OR REPLACE FUNCTION public.mark_document_processing_failed(
  p_document_id uuid,
  p_user_id uuid,
  p_processing_token uuid,
  p_error_category text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.documents
  SET status = 'failed',
      error_message = p_error_category,
      processing_token = null,
      updated_at = pg_catalog.now()
  WHERE id = p_document_id
    AND user_id = p_user_id
    AND processing_token = p_processing_token;

  RETURN FOUND; -- Returns true if updated, false if stale/no-op
END;
$$;

-- Lock down failure RPC permissions
REVOKE EXECUTE ON FUNCTION public.mark_document_processing_failed(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_document_processing_failed(uuid, uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_document_processing_failed(uuid, uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mark_document_processing_failed(uuid, uuid, uuid, text) TO service_role;
