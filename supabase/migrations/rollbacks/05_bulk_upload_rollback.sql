-- ==============================================================================
-- FileMind: Bulk PDF Upload Rollback
-- Migration: supabase_bulk_upload_rollback.sql
-- ==============================================================================

-- 1. Restore original create_document_with_quota (20 docs/hr rate limit)
CREATE OR REPLACE FUNCTION public.create_document_with_quota(
  p_id uuid,
  p_user_id uuid,
  p_filename text,
  p_storage_path text,
  p_file_size bigint
) RETURNS TABLE(result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $BODY$
DECLARE
  v_count int;
  v_rate_limit int := 20;
  v_actual_size bigint;
  v_owner text;
BEGIN
  IF pg_catalog.current_setting('request.jwt.claims', true)::jsonb->>'sub' IS NULL OR 
     (pg_catalog.current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch or not authenticated';
  END IF;

  IF pg_catalog.split_part(p_storage_path, '/', 1) != p_user_id::text THEN
    RAISE EXCEPTION 'Unauthorized: storage_path does not belong to user';
  END IF;

  SELECT (metadata->>'size')::bigint, owner_id 
  INTO v_actual_size, v_owner
  FROM storage.objects
  WHERE bucket_id = 'documents' AND name = p_storage_path;

  IF v_actual_size IS NULL THEN
    RAISE EXCEPTION 'Storage object does not exist';
  END IF;
  IF v_actual_size != p_file_size THEN
    RAISE EXCEPTION 'Storage object size mismatch';
  END IF;
  IF v_owner != p_user_id::text THEN
    RAISE EXCEPTION 'Storage object not owned by user';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text));

  SELECT count(*) INTO v_count
    FROM public.documents
    WHERE user_id = p_user_id
      AND created_at > pg_catalog.now() - INTERVAL '1 hour';

  IF v_count >= v_rate_limit THEN
    RETURN QUERY SELECT 'rate_limited'::text;
    RETURN;
  END IF;

  INSERT INTO public.documents (
    id, user_id, filename, storage_path, file_size, mime_type, status
  ) VALUES (
    p_id, p_user_id, p_filename, p_storage_path, p_file_size, 'application/pdf', 'pending'
  );

  RETURN QUERY SELECT 'ok'::text;
END;
$BODY$;

REVOKE EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint) TO authenticated;

-- 2. Restore original acquire_document_processing (from Phase 1A)
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

  RETURN v_new_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) TO service_role;

-- 3. Drop user and system claim functions
DROP FUNCTION IF EXISTS public.claim_next_pending_document(uuid);
DROP FUNCTION IF EXISTS public.claim_next_system_pending_document();
