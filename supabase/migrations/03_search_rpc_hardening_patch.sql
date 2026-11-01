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
