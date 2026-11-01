import 'server-only'
import { SupabaseClient } from '@supabase/supabase-js'
import { embedSearchQuery } from '@/lib/ai/embeddings'
import { hasActiveBiometricLease } from '@/lib/auth/webauthn'
import {
  SearchResultItem,
  HybridSearchOptions,
  SemanticCandidate,
  LexicalCandidate,
  DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD,
  CANDIDATE_LIMIT,
  fuseAndFilterSearchResults,
} from './search-fusion'

export * from './search-fusion'

export async function executeHybridSearch(
  supabase: SupabaseClient,
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return []
  }

  const filterDocId = options.documentId || null
  const minSimilarity =
    options.minSimilarity !== undefined
      ? options.minSimilarity
      : DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD

  if (filterDocId) {
    const { data: docCheck } = await supabase
      .from('documents')
      .select('id, is_locked')
      .eq('id', filterDocId)
      .maybeSingle()

    if (docCheck?.is_locked) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return []
      }

      const hasLease = await hasActiveBiometricLease(user.id, filterDocId)
      if (!hasLease) {
        return []
      }
    }
  }

  let queryEmbedding: number[] | null = null
  try {
    queryEmbedding = await embedSearchQuery(cleanQuery)
  } catch (err) {
    console.warn(`[Search] Semantic query embedding failed, falling back to lexical-only:`, err)
  }

  let semanticCandidates: SemanticCandidate[] = []

  if (queryEmbedding) {
    const { data, error } = await supabase.rpc('match_document_chunks', {
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_count: CANDIDATE_LIMIT,
      p_similarity_threshold: minSimilarity,
      p_filter_document_id: filterDocId,
    })

    if (!error && Array.isArray(data)) {
      semanticCandidates = data
    } else if (error) {
      console.warn(`[Search] match_document_chunks RPC error:`, error.message)
    }
  }

  let lexicalCandidates: LexicalCandidate[] = []

  const { data: lexData, error: lexError } = await supabase.rpc('search_document_chunks_lexical', {
    p_query_text: cleanQuery,
    p_match_count: CANDIDATE_LIMIT,
    p_filter_document_id: filterDocId,
  })

  if (!lexError && Array.isArray(lexData)) {
    lexicalCandidates = lexData
  } else if (lexError) {
    console.warn(`[Search] search_document_chunks_lexical RPC error:`, lexError.message)
  }

  if (semanticCandidates.length === 0 && lexicalCandidates.length === 0) {

    const strippedQuery = cleanQuery
      .replace(/^(what (is|are|were|was)|can you (explain|summarize|tell me about)|summarize (the|my)?|list (any|the)?|give me (an?|the)?)\s+/gi, '')
      .replace(/\s+(across my documents|in this document|in my vault|from the (uploaded )?documents?)\b/gi, '')
      .trim()

    if (strippedQuery && strippedQuery.length >= 3 && strippedQuery !== cleanQuery) {
      const { data: retryLexData } = await supabase.rpc('search_document_chunks_lexical', {
        p_query_text: strippedQuery,
        p_match_count: CANDIDATE_LIMIT,
        p_filter_document_id: filterDocId,
      })
      if (Array.isArray(retryLexData) && retryLexData.length > 0) {
        lexicalCandidates = retryLexData
      }
    }

    if (lexicalCandidates.length === 0 && filterDocId) {
      const { data: docFallbackChunks } = await supabase
        .from('document_chunks')
        .select('id, document_id, page_start, page_end, chunk_index, content')
        .eq('document_id', filterDocId)
        .order('chunk_index', { ascending: true })
        .limit(options.limit || 8)

      if (Array.isArray(docFallbackChunks) && docFallbackChunks.length > 0) {

        const { data: docInfo } = await supabase
          .from('documents')
          .select('filename, doc_category')
          .eq('id', filterDocId)
          .single()

        lexicalCandidates = docFallbackChunks.map((c) => ({
          chunk_id: c.id,
          document_id: c.document_id,
          filename: docInfo?.filename || 'Document',
          doc_category: docInfo?.doc_category,
          page_start: c.page_start,
          page_end: c.page_end,
          chunk_index: c.chunk_index,
          content: c.content,
          rank_score: 0.1,
          is_exact_match: false,
        }))
      }
    }
  }

  const candidateDocIds = Array.from(
    new Set([
      ...semanticCandidates.map((c) => c.document_id),
      ...lexicalCandidates.map((c) => c.document_id),
    ])
  )

  if (candidateDocIds.length > 0) {
    const { data: lockedDocs } = await supabase
      .from('documents')
      .select('id')
      .in('id', candidateDocIds)
      .eq('is_locked', true)

    if (lockedDocs && lockedDocs.length > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const allowedDocIds = new Set<string>()
      if (user) {
        for (const doc of lockedDocs) {
          const hasLease = await hasActiveBiometricLease(user.id, doc.id)
          if (hasLease) {
            allowedDocIds.add(doc.id)
          }
        }
      }

      const lockedDisallowed = new Set(
        lockedDocs.map((d) => d.id).filter((id) => !allowedDocIds.has(id))
      )

      if (lockedDisallowed.size > 0) {
        semanticCandidates = semanticCandidates.filter(
          (c) => !lockedDisallowed.has(c.document_id)
        )
        lexicalCandidates = lexicalCandidates.filter(
          (c) => !lockedDisallowed.has(c.document_id)
        )
      }
    }
  }

  const documentResults = fuseAndFilterSearchResults(
    semanticCandidates,
    lexicalCandidates,
    cleanQuery,
    { ...options, minSimilarity }
  )

  console.log(
    `[Search] queryLength=${cleanQuery.length} semanticCandidates=${semanticCandidates.length} lexicalCandidates=${lexicalCandidates.length} finalDocumentResults=${documentResults.length}`
  )

  return documentResults
}

export async function executeHybridPassageSearch(
  supabase: SupabaseClient,
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResultItem[]> {
  return executeHybridSearch(supabase, query, {
    ...options,
    deduplicateByDocument: false,
  })
}
