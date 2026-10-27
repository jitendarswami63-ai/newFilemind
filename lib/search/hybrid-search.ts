import 'server-only'
import { SupabaseClient } from '@supabase/supabase-js'
import { embedSearchQuery } from '@/lib/ai/embeddings'

export interface SearchResultItem {
  document_id: string
  filename: string
  doc_category?: string
  chunk_id: string
  page_start: number
  page_end: number
  matching_pages: number[]
  snippet: string
  score: number
}

export interface HybridSearchOptions {
  limit?: number
  documentId?: string
  minSimilarity?: number
}

const RRF_K = 60
const CANDIDATE_LIMIT = 30
const DEFAULT_RESULT_LIMIT = 20
const MAX_SNIPPET_LENGTH = 750
const MAX_COALESCED_SNIPPET_LENGTH = 1000
const EXACT_MATCH_BOOST = 0.05

/**
 * Extracts potential exact identifiers from a search query (e.g., INV-9842-X, numbers, uppercase codes).
 */
function extractIdentifiers(query: string): string[] {
  const matches = query.match(/\b([A-Za-z0-9-_]{4,})\b/g) || []
  return Array.from(new Set(matches.map((m) => m.trim()).filter((m) => m.length >= 4)))
}

/**
 * Creates a bounded snippet around the matched term or chunk start.
 */
function createBoundedSnippet(content: string, query: string, maxLength: number = MAX_SNIPPET_LENGTH): string {
  if (!content) return ''
  const trimmed = content.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  // Find position of the query or first identifier
  const lowerContent = trimmed.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  let matchIndex = lowerContent.indexOf(lowerQuery)

  if (matchIndex === -1) {
    const identifiers = extractIdentifiers(query)
    for (const id of identifiers) {
      matchIndex = lowerContent.indexOf(id.toLowerCase())
      if (matchIndex !== -1) break
    }
  }

  if (matchIndex === -1 || matchIndex < 100) {
    return trimmed.slice(0, maxLength).trim() + '...'
  }

  const start = Math.max(0, matchIndex - 150)
  const end = Math.min(trimmed.length, start + maxLength)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < trimmed.length ? '...' : ''

  return `${prefix}${trimmed.slice(start, end).trim()}${suffix}`
}

/**
 * Executes hybrid search combining semantic (vector) search and PostgreSQL lexical/exact search
 * using Reciprocal Rank Fusion (RRF k=60) with deterministic exact-match priority.
 */
export async function executeHybridSearch(
  supabase: SupabaseClient,
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return []
  }

  const resultLimit = Math.min(options.limit || DEFAULT_RESULT_LIMIT, 50)
  const filterDocId = options.documentId || null
  const identifiers = extractIdentifiers(cleanQuery)

  // 1. Generate query embedding for semantic channel
  let queryEmbedding: number[] | null = null
  try {
    queryEmbedding = await embedSearchQuery(cleanQuery)
  } catch (err) {
    console.warn(`[Search] Semantic query embedding failed, falling back to lexical-only:`, err)
  }

  // 2. Fetch semantic candidates via match_document_chunks RPC
  let semanticCandidates: Array<{
    chunk_id: string
    document_id: string
    filename: string
    doc_category: string
    page_start: number
    page_end: number
    chunk_index: number
    content: string
    similarity: number
  }> = []

  if (queryEmbedding) {
    const { data, error } = await supabase.rpc('match_document_chunks', {
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_count: CANDIDATE_LIMIT,
      p_similarity_threshold: options.minSimilarity || 0.0,
      p_filter_document_id: filterDocId,
    })

    if (!error && Array.isArray(data)) {
      semanticCandidates = data
    } else if (error) {
      console.warn(`[Search] match_document_chunks RPC error:`, error.message)
    }
  }

  // 3. Fetch lexical / exact candidates via search_document_chunks_lexical RPC
  let lexicalCandidates: Array<{
    chunk_id: string
    document_id: string
    filename: string
    doc_category: string
    page_start: number
    page_end: number
    chunk_index: number
    content: string
    rank_score: number
    is_exact_match: boolean
  }> = []

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

  // 4. Reciprocal Rank Fusion (RRF)
  interface ChunkMeta {
    chunk_id: string
    document_id: string
    filename: string
    doc_category?: string
    page_start: number
    page_end: number
    content: string
    semanticRank: number | null
    lexicalRank: number | null
    isExactMatch: boolean
  }

  const chunkMap = new Map<string, ChunkMeta>()

  // Map semantic candidates with 1-based ranks
  semanticCandidates.forEach((item, index) => {
    const rank = index + 1
    const existing = chunkMap.get(item.chunk_id)
    if (existing) {
      existing.semanticRank = rank
    } else {
      chunkMap.set(item.chunk_id, {
        chunk_id: item.chunk_id,
        document_id: item.document_id,
        filename: item.filename,
        doc_category: item.doc_category,
        page_start: item.page_start,
        page_end: item.page_end,
        content: item.content,
        semanticRank: rank,
        lexicalRank: null,
        isExactMatch: false,
      })
    }
  })

  // Map lexical candidates with 1-based ranks
  lexicalCandidates.forEach((item, index) => {
    const rank = index + 1
    const existing = chunkMap.get(item.chunk_id)
    if (existing) {
      existing.lexicalRank = rank
      if (item.is_exact_match) existing.isExactMatch = true
    } else {
      chunkMap.set(item.chunk_id, {
        chunk_id: item.chunk_id,
        document_id: item.document_id,
        filename: item.filename,
        doc_category: item.doc_category,
        page_start: item.page_start,
        page_end: item.page_end,
        content: item.content,
        semanticRank: null,
        lexicalRank: rank,
        isExactMatch: Boolean(item.is_exact_match),
      })
    }
  })

  // Check additional identifier matching in chunk content
  const lowerQuery = cleanQuery.toLowerCase()
  for (const item of Array.from(chunkMap.values())) {
    const lowerContent = item.content.toLowerCase()
    if (lowerContent.includes(lowerQuery)) {
      item.isExactMatch = true
    } else {
      for (const id of identifiers) {
        if (lowerContent.includes(id.toLowerCase())) {
          item.isExactMatch = true
          break
        }
      }
    }
  }

  // Calculate RRF score: 1 / (60 + semantic_rank) + 1 / (60 + lexical_rank) + exact_match_boost
  interface InternalScoredChunk {
    document_id: string
    filename: string
    doc_category?: string
    chunk_id: string
    page_start: number
    page_end: number
    content: string
    score: number
    rrfScore: number
  }

  const scoredChunks: InternalScoredChunk[] = []

  for (const item of Array.from(chunkMap.values())) {
    let score = 0

    if (item.semanticRank !== null) {
      score += 1 / (RRF_K + item.semanticRank)
    }

    if (item.lexicalRank !== null) {
      score += 1 / (RRF_K + item.lexicalRank)
    }

    if (item.isExactMatch) {
      score += EXACT_MATCH_BOOST
    }

    scoredChunks.push({
      document_id: item.document_id,
      filename: item.filename,
      doc_category: item.doc_category,
      chunk_id: item.chunk_id,
      page_start: item.page_start,
      page_end: item.page_end,
      content: item.content,
      score: Number(score.toFixed(6)),
      rrfScore: score,
    })
  }

  // Group scored chunks by document_id for document-level deduplication
  const docChunksMap = new Map<string, InternalScoredChunk[]>()
  for (const item of scoredChunks) {
    const list = docChunksMap.get(item.document_id) || []
    list.push(item)
    docChunksMap.set(item.document_id, list)
  }

  const documentResults: SearchResultItem[] = []

  for (const [, chunks] of Array.from(docChunksMap.entries())) {
    // 1. Sort chunks of this document strictly by RRF score descending
    chunks.sort((a, b) => b.rrfScore - a.rrfScore)
    const primary = chunks[0]

    // 2. Expand and collect all matching pages across all matching chunks
    const pageSet = new Set<number>()
    for (const c of chunks) {
      for (let p = c.page_start; p <= c.page_end; p++) {
        pageSet.add(p)
      }
    }
    const matchingPages = Array.from(pageSet).sort((a, b) => a - b)

    // 3. Snippet coalescing: start with primary chunk snippet
    let coalescedSnippet = createBoundedSnippet(primary.content, cleanQuery, MAX_SNIPPET_LENGTH)

    // If secondary chunks exist, coalesce distinct text context up to MAX_COALESCED_SNIPPET_LENGTH
    if (chunks.length > 1) {
      for (let i = 1; i < chunks.length; i++) {
        const sec = chunks[i]
        const secSnippet = createBoundedSnippet(sec.content, cleanQuery, 250)
        if (
          secSnippet &&
          !coalescedSnippet.toLowerCase().includes(secSnippet.slice(0, 40).toLowerCase()) &&
          coalescedSnippet.length + secSnippet.length + 15 <= MAX_COALESCED_SNIPPET_LENGTH
        ) {
          coalescedSnippet += ` ... [p.${sec.page_start}] ${secSnippet}`
        }
        if (coalescedSnippet.length >= MAX_COALESCED_SNIPPET_LENGTH - 100) break
      }
    }

    if (coalescedSnippet.length > MAX_COALESCED_SNIPPET_LENGTH) {
      coalescedSnippet = coalescedSnippet.slice(0, MAX_COALESCED_SNIPPET_LENGTH).trim() + '...'
    }

    // 4. Primary chunk determines the document's highest score
    documentResults.push({
      document_id: primary.document_id,
      filename: primary.filename,
      doc_category: primary.doc_category,
      chunk_id: primary.chunk_id,
      page_start: primary.page_start,
      page_end: primary.page_end,
      matching_pages: matchingPages,
      snippet: coalescedSnippet,
      score: primary.score,
    })
  }

  // Sort document results strictly by highest document score descending
  documentResults.sort((a, b) => b.score - a.score)

  console.log(
    `[Search] queryLength=${cleanQuery.length} semanticCandidates=${semanticCandidates.length} lexicalCandidates=${lexicalCandidates.length} finalDocumentResults=${documentResults.length}`
  )

  return documentResults.slice(0, resultLimit)
}
