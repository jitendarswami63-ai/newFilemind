CREATE TABLE IF NOT EXISTS public.biometric_credentials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id       text NOT NULL UNIQUE,
  public_key          text NOT NULL,
  counter             bigint NOT NULL DEFAULT 0,
  device_name         text NOT NULL DEFAULT 'Device Authenticator',
  authenticator_type  text NOT NULL DEFAULT 'platform',
  aaguid              text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  last_used_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user ON public.biometric_credentials(user_id);
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biometric_credentials_select_own" ON public.biometric_credentials;
CREATE POLICY "biometric_credentials_select_own"
  ON public.biometric_credentials FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "biometric_credentials_delete_own" ON public.biometric_credentials;
CREATE POLICY "biometric_credentials_delete_own"
  ON public.biometric_credentials FOR DELETE
  USING (auth.uid() = user_id);

GRANT ALL ON public.biometric_credentials TO service_role;
GRANT SELECT, DELETE ON public.biometric_credentials TO authenticated;

CREATE TABLE IF NOT EXISTS public.biometric_leases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id         uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  credential_id       text REFERENCES public.biometric_credentials(credential_id) ON DELETE SET NULL,
  session_fingerprint text NOT NULL,
  expires_at          timestamptz NOT NULL,
  revoked_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biometric_leases_lookup 
  ON public.biometric_leases(user_id, document_id, expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.biometric_leases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.biometric_leases FROM anon, authenticated;
GRANT ALL ON public.biometric_leases TO service_role;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS key_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS encrypted_dek text,
  ADD COLUMN IF NOT EXISTS dek_iv text,
  ADD COLUMN IF NOT EXISTS dek_tag text,
  ADD COLUMN IF NOT EXISTS file_iv text,
  ADD COLUMN IF NOT EXISTS file_tag text;

CREATE INDEX IF NOT EXISTS idx_documents_user_locked ON public.documents(user_id, is_locked);

CREATE OR REPLACE FUNCTION public.has_active_biometric_lease(p_doc_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.biometric_leases
    WHERE document_id = p_doc_id
      AND user_id = p_user_id
      AND expires_at > pg_catalog.now()
      AND revoked_at IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_biometric_lease(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_biometric_lease(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_query_embedding public.vector(768),
  p_match_count integer,
  p_similarity_threshold real DEFAULT 0.0,
  p_filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  filename text,
  doc_category text,
  page_start integer,
  page_end integer,
  chunk_index integer,
  content text,
  similarity real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
BEGIN
  v_limit := LEAST(GREATEST(COALESCE(p_match_count, 20), 1), 100);

  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    d.filename,
    d.doc_category,
    c.page_start,
    c.page_end,
    c.chunk_index,
    c.content,
    (1 - (c.embedding OPERATOR(public.<=>) p_query_embedding))::real AS similarity
  FROM public.document_chunks c
  JOIN public.documents d ON d.id = c.document_id
  WHERE d.user_id = auth.uid()
    AND d.embedding_status = 'completed'
    AND (p_filter_document_id IS NULL OR c.document_id = p_filter_document_id)
    AND (d.is_locked = false OR public.has_active_biometric_lease(d.id, auth.uid()))
    AND (1 - (c.embedding OPERATOR(public.<=>) p_query_embedding)) >= p_similarity_threshold
  ORDER BY c.embedding OPERATOR(public.<=>) p_query_embedding ASC
  LIMIT v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.match_document_chunks(public.vector, integer, real, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(public.vector, integer, real, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(public.vector, integer, real, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(public.vector, integer, real, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.search_document_chunks_lexical(
  p_query_text text,
  p_match_count integer,
  p_filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  filename text,
  doc_category text,
  page_start integer,
  page_end integer,
  chunk_index integer,
  content text,
  rank_score real,
  is_exact_match boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_query text;
  v_tsquery pg_catalog.tsquery;
  v_limit integer;
BEGIN
  v_clean_query := pg_catalog.btrim(p_query_text);
  v_limit := LEAST(GREATEST(COALESCE(p_match_count, 20), 1), 100);

  IF v_clean_query = '' OR v_clean_query IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    v_tsquery := pg_catalog.websearch_to_tsquery('pg_catalog.english'::pg_catalog.regconfig, v_clean_query);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := NULL;
  END;

  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    d.filename,
    d.doc_category,
    c.page_start,
    c.page_end,
    c.chunk_index,
    c.content,
    (CASE
      WHEN v_tsquery IS NOT NULL AND c.fts_tokens OPERATOR(pg_catalog.@@) v_tsquery THEN
        pg_catalog.ts_rank_cd(c.fts_tokens, v_tsquery)::real
      ELSE 0.1::real
    END) AS rank_score,
    (c.content ILIKE ('%' || v_clean_query || '%')) AS is_exact_match
  FROM public.document_chunks c
  JOIN public.documents d ON d.id = c.document_id
  WHERE d.user_id = auth.uid()
    AND d.embedding_status = 'completed'
    AND (p_filter_document_id IS NULL OR c.document_id = p_filter_document_id)
    AND (d.is_locked = false OR public.has_active_biometric_lease(d.id, auth.uid()))
    AND (
      (v_tsquery IS NOT NULL AND c.fts_tokens OPERATOR(pg_catalog.@@) v_tsquery)
      OR c.content ILIKE ('%' || v_clean_query || '%')
    )
  ORDER BY
    (c.content ILIKE ('%' || v_clean_query || '%')) DESC,
    rank_score DESC
  LIMIT v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_document_chunks_lexical(text, integer, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_document_chunks_lexical(text, integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_document_chunks_lexical(text, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_document_chunks_lexical(text, integer, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
