CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS embedding_status text NOT NULL DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS embedding_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embedding_error text,
  ADD COLUMN IF NOT EXISTS embedding_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_token uuid;

CREATE INDEX IF NOT EXISTS documents_user_embedding_status_idx
  ON public.documents(user_id, embedding_status);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_start      integer     NOT NULL,
  page_end        integer     NOT NULL,
  chunk_index     integer     NOT NULL,
  content         text        NOT NULL,
  content_hash    text        NOT NULL,
  embedding       public.vector(768),
  fts_tokens      tsvector    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
  ON public.document_chunks(document_id);

CREATE INDEX IF NOT EXISTS document_chunks_document_chunk_idx
  ON public.document_chunks(document_id, chunk_index);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON public.document_chunks
  USING hnsw (embedding public.vector_cosine_ops);

CREATE INDEX IF NOT EXISTS document_chunks_fts_idx
  ON public.document_chunks
  USING gin (fts_tokens);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_chunks_select_own" ON public.document_chunks;

CREATE POLICY "document_chunks_select_own" ON public.document_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_chunks.document_id AND d.user_id = auth.uid()
  ));

REVOKE INSERT, UPDATE, DELETE ON public.document_chunks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.acquire_document_indexing(
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
  SET embedding_status = 'processing',
      embedding_started_at = pg_catalog.now(),
      embedding_locked_at = pg_catalog.now(),
      embedding_attempts = embedding_attempts + 1,
      embedding_token = pg_catalog.gen_random_uuid()
  WHERE id = p_document_id
    AND user_id = p_user_id
    AND status = 'completed'
    AND (
      embedding_status IN ('pending', 'failed')
      OR (embedding_status = 'processing' AND embedding_locked_at < pg_catalog.now() - interval '10 minutes')
    )
    AND embedding_attempts < 3
  RETURNING embedding_token INTO v_new_token;

  RETURN v_new_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_document_indexing(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_document_indexing(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.acquire_document_indexing(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_document_indexing(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_document_indexing(
  p_document_id uuid,
  p_user_id uuid,
  p_embedding_token uuid,
  p_chunks jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = p_document_id AND user_id = p_user_id AND embedding_token = p_embedding_token
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM public.document_chunks WHERE document_id = p_document_id;

  INSERT INTO public.document_chunks (
    document_id,
    page_start,
    page_end,
    chunk_index,
    content,
    content_hash,
    embedding
  )
  SELECT
    p_document_id,
    (item->>'page_start')::integer,
    (item->>'page_end')::integer,
    (item->>'chunk_index')::integer,
    item->>'content',
    item->>'content_hash',
    (item->>'embedding')::public.vector(768)
  FROM pg_catalog.jsonb_array_elements(p_chunks) AS item;

  UPDATE public.documents
  SET embedding_status = 'completed',
      embedding_completed_at = pg_catalog.now(),
      embedding_token = null,
      embedding_error = null,
      updated_at = pg_catalog.now()
  WHERE id = p_document_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_document_indexing(uuid, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_document_indexing(uuid, uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finalize_document_indexing(uuid, uuid, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_document_indexing(uuid, uuid, uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_document_indexing_failed(
  p_document_id uuid,
  p_user_id uuid,
  p_embedding_token uuid,
  p_error text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.documents
  SET embedding_status = 'failed',
      embedding_error = p_error,
      embedding_token = null,
      updated_at = pg_catalog.now()
  WHERE id = p_document_id
    AND user_id = p_user_id
    AND embedding_token = p_embedding_token;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_document_indexing_failed(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_document_indexing_failed(uuid, uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_document_indexing_failed(uuid, uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mark_document_indexing_failed(uuid, uuid, uuid, text) TO service_role;

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
