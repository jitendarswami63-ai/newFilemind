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
  content?: string
}

export interface HybridSearchOptions {
  limit?: number
  documentId?: string
  minSimilarity?: number
  deduplicateByDocument?: boolean
}

export interface SemanticCandidate {
  chunk_id: string
  document_id: string
  filename: string
  doc_category?: string
  page_start: number
  page_end: number
  chunk_index?: number
  content: string
  similarity: number
}

export interface LexicalCandidate {
  chunk_id: string
  document_id: string
  filename: string
  doc_category?: string
  page_start: number
  page_end: number
  chunk_index?: number
  content: string
  rank_score?: number
  is_exact_match?: boolean
}

export const DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD = 0.65
export const RRF_K = 60
export const CANDIDATE_LIMIT = 30
export const DEFAULT_RESULT_LIMIT = 20
export const MAX_SNIPPET_LENGTH = 750
export const MAX_COALESCED_SNIPPET_LENGTH = 1000
export const EXACT_MATCH_BOOST = 0.05

export function extractIdentifiers(query: string): string[] {
  const matches = query.match(/\b([A-Za-z0-9-_]{4,})\b/g) || []
  return Array.from(new Set(matches.map((m) => m.trim()).filter((m) => m.length >= 4)))
}

export function createBoundedSnippet(
  content: string,
  query: string,
  maxLength: number = MAX_SNIPPET_LENGTH
): string {
  if (!content) return ''
  const trimmed = content.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

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

export function fuseAndFilterSearchResults(
  semanticCandidates: SemanticCandidate[] = [],
  lexicalCandidates: LexicalCandidate[] = [],
  query: string,
  options: HybridSearchOptions = {}
): SearchResultItem[] {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return []
  }

  const resultLimit = Math.min(options.limit ?? DEFAULT_RESULT_LIMIT, 50)
  const minSimilarity =
    options.minSimilarity !== undefined
      ? options.minSimilarity
      : DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD

  const identifiers = extractIdentifiers(cleanQuery)

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
    similarity: number | null
  }

  const chunkMap = new Map<string, ChunkMeta>()

  const sortedSemantic = [...semanticCandidates].sort(
    (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)
  )
  sortedSemantic.forEach((item, index) => {
    const rank = index + 1
    const existing = chunkMap.get(item.chunk_id)
    if (existing) {
      existing.semanticRank = rank
      existing.similarity = item.similarity
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
        similarity: typeof item.similarity === 'number' ? item.similarity : null,
      })
    }
  })

  const sortedLexical = [...lexicalCandidates].sort(
    (a, b) => (b.rank_score ?? 0) - (a.rank_score ?? 0)
  )
  sortedLexical.forEach((item, index) => {
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
        similarity: null,
      })
    }
  })

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
  let semanticOnlyRejectedCount = 0

  for (const item of Array.from(chunkMap.values())) {
    const isKeywordMatch = item.lexicalRank !== null || item.isExactMatch
    const isSemanticOnly = item.semanticRank !== null && !isKeywordMatch

    if (isSemanticOnly) {
      const sim = typeof item.similarity === 'number' ? item.similarity : 0
      if (sim < minSimilarity) {
        semanticOnlyRejectedCount++
        continue
      }
    }

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

  const rawSimilarities = semanticCandidates
    .map((c) => c.similarity)
    .filter((s): s is number => typeof s === 'number')
  const minRawSimilarity = rawSimilarities.length ? Math.min(...rawSimilarities) : null
  const maxRawSimilarity = rawSimilarities.length ? Math.max(...rawSimilarities) : null

  if (options.deduplicateByDocument === false) {
    scoredChunks.sort((a, b) => b.score - a.score)
    const passageResults: SearchResultItem[] = scoredChunks.slice(0, resultLimit).map((c) => ({
      document_id: c.document_id,
      filename: c.filename,
      doc_category: c.doc_category,
      chunk_id: c.chunk_id,
      page_start: c.page_start,
      page_end: c.page_end,
      matching_pages: [c.page_start],
      snippet: createBoundedSnippet(c.content, cleanQuery, MAX_SNIPPET_LENGTH),
      score: c.score,
      content: c.content,
    }))

    console.log(
      `[Search Diagnostic] query="${cleanQuery}" (Passage Mode) effectiveThreshold=${minSimilarity} semanticCandidates=${semanticCandidates.length} lexicalCandidates=${lexicalCandidates.length} minRawSimilarity=${minRawSimilarity !== null ? minRawSimilarity.toFixed(4) : 'none'} maxRawSimilarity=${maxRawSimilarity !== null ? maxRawSimilarity.toFixed(4) : 'none'} semanticOnlyRejected=${semanticOnlyRejectedCount} finalPassages=${passageResults.length}`
    )
    return passageResults
  }

  const docChunksMap = new Map<string, InternalScoredChunk[]>()
  for (const item of scoredChunks) {
    const list = docChunksMap.get(item.document_id) || []
    list.push(item)
    docChunksMap.set(item.document_id, list)
  }

  const documentResults: SearchResultItem[] = []

  for (const [, chunks] of Array.from(docChunksMap.entries())) {
    chunks.sort((a, b) => b.rrfScore - a.rrfScore)
    const primary = chunks[0]

    const pageSet = new Set<number>()
    for (const c of chunks) {
      for (let p = c.page_start; p <= c.page_end; p++) {
        pageSet.add(p)
      }
    }
    const matchingPages = Array.from(pageSet).sort((a, b) => a - b)

    let coalescedSnippet = createBoundedSnippet(primary.content, cleanQuery, MAX_SNIPPET_LENGTH)

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
      content: primary.content,
    })
  }

  documentResults.sort((a, b) => b.score - a.score)

  console.log(
    `[Search Diagnostic] query="${cleanQuery}" effectiveThreshold=${minSimilarity} semanticCandidates=${semanticCandidates.length} lexicalCandidates=${lexicalCandidates.length} minRawSimilarity=${minRawSimilarity !== null ? minRawSimilarity.toFixed(4) : 'none'} maxRawSimilarity=${maxRawSimilarity !== null ? maxRawSimilarity.toFixed(4) : 'none'} semanticOnlyRejected=${semanticOnlyRejectedCount} finalDocumentResults=${documentResults.length}`
  )

  return documentResults.slice(0, resultLimit)
}
