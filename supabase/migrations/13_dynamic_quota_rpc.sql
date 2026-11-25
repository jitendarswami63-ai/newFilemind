-- Upgrade create_document_with_quota to respect dynamic per-user plan quotas (Free 100MB, Pro 1GB, Elite 10GB, Add-on Packs)
CREATE OR REPLACE FUNCTION public.create_document_with_quota(
  p_id uuid,
  p_user_id uuid,
  p_filename text,
  p_storage_path text,
  p_file_size bigint,
  p_max_storage_bytes bigint DEFAULT 2147483648
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_size bigint;
  v_recent_uploads int;
  v_quota_limit bigint := COALESCE(NULLIF(p_max_storage_bytes, 0), 2147483648);
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id does not match authenticated caller';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COUNT(*) INTO v_recent_uploads
  FROM public.documents
  WHERE user_id = p_user_id
    AND created_at > now() - interval '1 minute';

  IF v_recent_uploads >= 150 THEN
    RETURN 'rate_limited';
  END IF;

  SELECT COALESCE(SUM(file_size), 0) INTO v_total_size
  FROM public.documents
  WHERE user_id = p_user_id;

  IF (v_total_size + p_file_size) > v_quota_limit THEN
    RETURN 'storage_quota_exceeded';
  END IF;

  INSERT INTO public.documents (id, user_id, filename, storage_path, file_size, status)
  VALUES (p_id, p_user_id, p_filename, p_storage_path, p_file_size, 'pending');

  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_document_with_quota(uuid, uuid, text, text, bigint, bigint) TO authenticated;
