-- Migration: 06_reduce_stale_lock_duration.sql
-- Description: Reduces the document processing stale lock duration from 10 minutes to 2 minutes
-- to prevent documents from being locked as zombies for 10 minutes following serverless timeouts.

-- 1. Update claim_next_pending_document
CREATE OR REPLACE FUNCTION public.claim_next_pending_document(
  p_user_id uuid
)
RETURNS TABLE(
  document_id uuid,
  processing_token uuid,
  filename text,
  storage_path text,
  file_size bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $BODY$
DECLARE
  v_doc_id uuid;
  v_new_token uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  UPDATE public.documents
     SET status = 'failed',
         processing_stage = 'failed',
         error_message = 'Processing attempts exhausted (3/3). Please retry manually.',
         processing_locked_at = NULL,
         processing_token = NULL,
         updated_at = pg_catalog.now()
   WHERE user_id = p_user_id
     AND status = 'processing'
     AND processing_locked_at < pg_catalog.now() - INTERVAL '2 minutes'
     AND processing_attempts >= 3;

  SELECT d.id INTO v_doc_id
    FROM public.documents d
   WHERE d.user_id = p_user_id
     AND (
       d.status = 'pending'
       OR (d.status = 'processing' AND d.processing_locked_at < pg_catalog.now() - INTERVAL '2 minutes')
     )
     AND d.processing_attempts < 3
   ORDER BY d.created_at ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF v_doc_id IS NULL THEN
    RETURN;
  END IF;

  v_new_token := pg_catalog.gen_random_uuid();

  UPDATE public.documents
     SET status = 'processing',
         processing_stage = 'starting',
         processing_locked_at = pg_catalog.now(),
         processing_attempts = processing_attempts + 1,
         processing_token = v_new_token,
         updated_at = pg_catalog.now()
   WHERE id = v_doc_id;

  RETURN QUERY
    SELECT d.id, d.processing_token, d.filename, d.storage_path, d.file_size
      FROM public.documents d
     WHERE d.id = v_doc_id;
END;
$BODY$;

REVOKE EXECUTE ON FUNCTION public.claim_next_pending_document(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_next_pending_document(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_next_pending_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_pending_document(uuid) TO service_role;

-- 2. Update claim_next_system_pending_document
CREATE OR REPLACE FUNCTION public.claim_next_system_pending_document()
RETURNS TABLE(
  document_id uuid,
  user_id uuid,
  processing_token uuid,
  filename text,
  storage_path text,
  file_size bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $BODY$
DECLARE
  v_doc_id uuid;
  v_new_token uuid;
  v_claims jsonb;
  v_role text;
BEGIN
  BEGIN
    v_claims := pg_catalog.current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_claims := NULL;
  END;

  IF v_claims IS NOT NULL THEN
    v_role := v_claims->>'role';
    IF v_role != 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: claim_next_system_pending_document requires service_role privilege';
    END IF;
  END IF;

  UPDATE public.documents
     SET status = 'failed',
         processing_stage = 'failed',
         error_message = 'Processing attempts exhausted (3/3). Please retry manually.',
         processing_locked_at = NULL,
         processing_token = NULL,
         updated_at = pg_catalog.now()
   WHERE status = 'processing'
     AND processing_locked_at < pg_catalog.now() - INTERVAL '2 minutes'
     AND processing_attempts >= 3;

  SELECT d.id INTO v_doc_id
    FROM public.documents d
   WHERE (
       d.status = 'pending'
       OR (d.status = 'processing' AND d.processing_locked_at < pg_catalog.now() - INTERVAL '2 minutes')
     )
     AND d.processing_attempts < 3
   ORDER BY d.created_at ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF v_doc_id IS NULL THEN
    RETURN;
  END IF;

  v_new_token := pg_catalog.gen_random_uuid();

  UPDATE public.documents
     SET status = 'processing',
         processing_stage = 'starting',
         processing_locked_at = pg_catalog.now(),
         processing_attempts = processing_attempts + 1,
         processing_token = v_new_token,
         updated_at = pg_catalog.now()
   WHERE id = v_doc_id;

  RETURN QUERY
    SELECT d.id, d.user_id, d.processing_token, d.filename, d.storage_path, d.file_size
      FROM public.documents d
     WHERE d.id = v_doc_id;
END;
$BODY$;

REVOKE EXECUTE ON FUNCTION public.claim_next_system_pending_document() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_next_system_pending_document() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_next_system_pending_document() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_system_pending_document() TO service_role;

-- 3. Update acquire_document_processing
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
      processing_attempts = CASE
        WHEN status = 'failed' OR (status = 'processing' AND processing_locked_at < pg_catalog.now() - interval '2 minutes' AND processing_attempts >= 3) THEN 1
        ELSE processing_attempts + 1
      END,
      processing_token = pg_catalog.gen_random_uuid(),
      error_message = NULL,
      updated_at = pg_catalog.now()
  WHERE id = p_document_id
    AND user_id = p_user_id
    AND (
      status = 'failed'
      OR (status = 'pending' AND processing_attempts < 3)
      OR (status = 'processing' AND processing_locked_at < pg_catalog.now() - interval '2 minutes')
    )
  RETURNING processing_token INTO v_new_token;

  RETURN v_new_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) TO service_role;
