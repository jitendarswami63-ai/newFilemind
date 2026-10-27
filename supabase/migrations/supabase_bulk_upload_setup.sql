-- ==============================================================================
-- FileMind: Bulk PDF Upload (100–150 Files) & Queue Processing Migration
-- Migration: supabase_bulk_upload_setup.sql
-- ==============================================================================

-- 1. Upgrade create_document_with_quota to support bulk batches (250 docs/hr)
--    and enforce cumulative storage capacity quota (2 GB ceiling)
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
  v_rate_limit int := 250; -- Raised from 20 to 250 to support bulk uploads up to 150 files
  v_actual_size bigint;
  v_owner text;
  v_total_storage bigint;
  v_max_storage_bytes bigint := 2147483648; -- 2 GB cumulative storage limit per user
BEGIN
  -- Security Invariant 1: Auth JWT verification
  IF pg_catalog.current_setting('request.jwt.claims', true)::jsonb->>'sub' IS NULL OR 
     (pg_catalog.current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch or not authenticated';
  END IF;

  -- Security Invariant 2: User namespace path isolation
  IF pg_catalog.split_part(p_storage_path, '/', 1) != p_user_id::text THEN
    RAISE EXCEPTION 'Unauthorized: storage_path does not belong to user';
  END IF;

  -- Security Invariant 3: Authoritative storage object verification
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

  -- Security Invariant 4: Transactional advisory lock preventing race conditions
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text));

  -- Quota Check A: Rate limit (250 docs/hour)
  SELECT count(*) INTO v_count
    FROM public.documents
    WHERE user_id = p_user_id
      AND created_at > pg_catalog.now() - INTERVAL '1 hour';

  IF v_count >= v_rate_limit THEN
    RETURN QUERY SELECT 'rate_limited'::text;
    RETURN;
  END IF;

  -- Quota Check B: Cumulative storage ceiling (2 GB)
  SELECT COALESCE(sum(file_size), 0) INTO v_total_storage
    FROM public.documents
    WHERE user_id = p_user_id;

  IF (v_total_storage + p_file_size) > v_max_storage_bytes THEN
    RETURN QUERY SELECT 'storage_quota_exceeded'::text;
    RETURN;
  END IF;

  -- Insert document record with pending status
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

-- 2. Durable User Queue Worker Claim RPC (Atomic lease acquisition with SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_next_pending_document(
  p_user_id uuid
) RETURNS TABLE(
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
  v_claims jsonb;
  v_role text;
  v_sub text;
BEGIN
  -- Authenticated user validation (handles authenticated JWT, service_role, and internal contexts)
  BEGIN
    v_claims := pg_catalog.current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_claims := NULL;
  END;

  IF v_claims IS NOT NULL THEN
    v_role := v_claims->>'role';
    v_sub := v_claims->>'sub';

    -- If caller is authenticated user, strictly enforce sub = p_user_id
    IF v_role = 'authenticated' THEN
      IF v_sub IS NULL OR v_sub::uuid != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: user_id mismatch';
      END IF;
    ELSIF v_role IS NOT NULL AND v_role != 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: invalid caller role';
    END IF;
  END IF;

  -- Step A: Transition stale jobs for this user that exhausted attempts (>= 3) to terminal 'failed' state
  UPDATE public.documents
     SET status = 'failed',
         processing_stage = 'failed',
         error_message = 'Processing attempts exhausted (3/3). Please retry manually.',
         processing_locked_at = NULL,
         processing_token = NULL,
         updated_at = pg_catalog.now()
   WHERE user_id = p_user_id
     AND status = 'processing'
     AND processing_locked_at < pg_catalog.now() - INTERVAL '10 minutes'
     AND processing_attempts >= 3;

  -- Step B: Atomically select and lock the oldest pending document or retryable stale processing document (< 3 attempts)
  SELECT d.id INTO v_doc_id
    FROM public.documents d
   WHERE d.user_id = p_user_id
     AND (
       d.status = 'pending'
       OR (d.status = 'processing' AND d.processing_locked_at < pg_catalog.now() - INTERVAL '10 minutes')
     )
     AND d.processing_attempts < 3
   ORDER BY d.created_at ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF v_doc_id IS NULL THEN
    RETURN;
  END IF;

  v_new_token := pg_catalog.gen_random_uuid();

  -- Claim the lease
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

-- 3. System Queue Claim RPC for Background Crons (Service-Role Only)
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
  -- Security Invariant: Only service_role or internal DB contexts may invoke system-wide claim
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

  -- Step A: Transition stale jobs across all users that exhausted attempts (>= 3) to terminal 'failed' state
  UPDATE public.documents
     SET status = 'failed',
         processing_stage = 'failed',
         error_message = 'Processing attempts exhausted (3/3). Please retry manually.',
         processing_locked_at = NULL,
         processing_token = NULL,
         updated_at = pg_catalog.now()
   WHERE status = 'processing'
     AND processing_locked_at < pg_catalog.now() - INTERVAL '10 minutes'
     AND processing_attempts >= 3;

  -- Step B: Atomically select and lock the oldest pending document or retryable stale processing document (< 3 attempts)
  SELECT d.id INTO v_doc_id
    FROM public.documents d
   WHERE (
       d.status = 'pending'
       OR (d.status = 'processing' AND d.processing_locked_at < pg_catalog.now() - INTERVAL '10 minutes')
     )
     AND d.processing_attempts < 3
   ORDER BY d.created_at ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF v_doc_id IS NULL THEN
    RETURN;
  END IF;

  v_new_token := pg_catalog.gen_random_uuid();

  -- Claim the lease
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

-- 4. Upgrade acquire_document_processing to allow manual retry of failed documents
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
  -- If document was in terminal 'failed' state or stale processing with exhausted attempts, reset attempts for user-initiated retry
  UPDATE public.documents
  SET status = 'processing', 
      processing_stage = 'starting', 
      processing_locked_at = pg_catalog.now(), 
      processing_attempts = CASE 
        WHEN status = 'failed' OR (status = 'processing' AND processing_locked_at < pg_catalog.now() - interval '10 minutes' AND processing_attempts >= 3) THEN 1 
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
      OR (status = 'processing' AND processing_locked_at < pg_catalog.now() - interval '10 minutes')
    )
  RETURNING processing_token INTO v_new_token;

  RETURN v_new_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) TO service_role;
