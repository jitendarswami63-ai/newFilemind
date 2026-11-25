-- Allow acquire_document_processing to reclaim paused checkpoints whose processing_locked_at was released (NULL)
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
        WHEN status = 'failed'
          OR (
            status = 'processing'
            AND (processing_locked_at IS NULL OR processing_locked_at < pg_catalog.now() - interval '2 minutes')
            AND processing_attempts >= 3
          ) THEN 1
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
      OR (
        status = 'processing'
        AND (processing_locked_at IS NULL OR processing_locked_at < pg_catalog.now() - interval '2 minutes')
      )
    )
  RETURNING processing_token INTO v_new_token;

  RETURN v_new_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_document_processing(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
