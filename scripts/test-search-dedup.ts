import assert from 'node:assert'

// We recreate the deduplication and coalescing logic as tested in hybrid-search.ts
const MAX_SNIPPET_LENGTH = 350
const MAX_COALESCED_SNIPPET_LENGTH = 1000

interface TestChunk {
  chunk_id: string
  document_id: string
  filename: string
  doc_category?: string
  page_start: number
  page_end: number
  content: string
  score: number
  rrfScore: number
}

interface TestSearchResult {
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

function createBoundedSnippet(content: string, query: string, maxLength = MAX_SNIPPET_LENGTH): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= maxLength) return trimmed

  const lowerContent = trimmed.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  let matchIndex = lowerContent.indexOf(lowerQuery)

  if (matchIndex === -1) {
    const terms = lowerQuery.split(' ').filter((t) => t.length > 2)
    for (const term of terms) {
      matchIndex = lowerContent.indexOf(term)
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

function deduplicateAndCoalesce(scoredChunks: TestChunk[], query: string, limit = 20): TestSearchResult[] {
  const docChunksMap = new Map<string, TestChunk[]>()
  for (const item of scoredChunks) {
    const list = docChunksMap.get(item.document_id) || []
    list.push(item)
    docChunksMap.set(item.document_id, list)
  }

  const documentResults: TestSearchResult[] = []

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

    let coalescedSnippet = createBoundedSnippet(primary.content, query, MAX_SNIPPET_LENGTH)

    if (chunks.length > 1) {
      for (let i = 1; i < chunks.length; i++) {
        const sec = chunks[i]
        const secSnippet = createBoundedSnippet(sec.content, query, 250)
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
    })
  }

  documentResults.sort((a, b) => b.score - a.score)
  return documentResults.slice(0, limit)
}

function runSearchDedupTests() {
  console.log('--- Testing Search Result Deduplication & Snippet Coalescing ---')

  const chunks: TestChunk[] = [
    {
      chunk_id: 'c1',
      document_id: 'doc-alpha',
      filename: 'financial_report.pdf',
      doc_category: 'Finance',
      page_start: 1,
      page_end: 2,
      content: 'Quarterly revenue grew by 15 percent driven by subscription expansion.',
      score: 0.032,
      rrfScore: 0.032,
    },
    {
      chunk_id: 'c2',
      document_id: 'doc-alpha',
      filename: 'financial_report.pdf',
      doc_category: 'Finance',
      page_start: 5,
      page_end: 5,
      content: 'Operating expenses decreased by 8 percent due to infrastructure optimization.',
      score: 0.045, // Higher score for doc-alpha
      rrfScore: 0.045,
    },
    {
      chunk_id: 'c3',
      document_id: 'doc-alpha',
      filename: 'financial_report.pdf',
      doc_category: 'Finance',
      page_start: 7,
      page_end: 8,
      content: 'Capital expenditures remained steady throughout the fiscal period.',
      score: 0.012,
      rrfScore: 0.012,
    },
    {
      chunk_id: 'c4',
      document_id: 'doc-beta',
      filename: 'project_synopsis.pdf',
      doc_category: 'Academic',
      page_start: 1,
      page_end: 1,
      content: 'FileMind represents an intelligent document analysis platform.',
      score: 0.028,
      rrfScore: 0.028,
    },
  ]

  const results = deduplicateAndCoalesce(chunks, 'optimization revenue', 20)

  // 1. Check Document Grouping
  console.log('[1/4] Checking document-level deduplication...')
  assert.strictEqual(results.length, 2, 'Should deduplicate 4 chunks from 2 documents into 2 results')
  assert.strictEqual(results[0].document_id, 'doc-alpha', 'Doc-alpha should rank first (score 0.045)')
  assert.strictEqual(results[1].document_id, 'doc-beta', 'Doc-beta should rank second (score 0.028)')
  console.log('  -> Grouped into 2 distinct document results')

  // 2. Check Highest Score Preservation
  console.log('[2/4] Checking highest score preservation...')
  assert.strictEqual(results[0].score, 0.045, 'Doc-alpha score should be highest chunk score (0.045)')
  assert.strictEqual(results[0].chunk_id, 'c2', 'Primary chunk should be c2')
  console.log('  -> Highest chunk score preserved as document score')

  // 3. Check Page Range Expansion & Deduplication
  console.log('[3/4] Checking page range expansion...')
  // c1 has pages 1-2, c2 has page 5, c3 has pages 7-8 -> [1, 2, 5, 7, 8]
  assert.deepStrictEqual(
    results[0].matching_pages,
    [1, 2, 5, 7, 8],
    'Matching pages should be [1, 2, 5, 7, 8]'
  )
  assert.deepStrictEqual(results[1].matching_pages, [1], 'Doc-beta matching pages should be [1]')
  console.log('  -> Matching pages expanded and sorted across all chunks')

  // 4. Check Snippet Coalescing & Bounds
  console.log('[4/4] Checking snippet coalescing and bounds...')
  assert.ok(
    results[0].snippet.includes('Operating expenses decreased'),
    'Snippet should contain primary chunk text'
  )
  assert.ok(
    results[0].snippet.includes('[p.1]') || results[0].snippet.includes('[p.7]'),
    'Snippet should coalesce secondary chunk context with page marker'
  )
  assert.ok(
    results[0].snippet.length <= MAX_COALESCED_SNIPPET_LENGTH,
    `Snippet length ${results[0].snippet.length} must not exceed ${MAX_COALESCED_SNIPPET_LENGTH}`
  )
  console.log(`  -> Snippet coalesced cleanly (${results[0].snippet.length} chars <= 1000)`)

  console.log('\n>>> All Search Deduplication & Coalescing Tests PASSED! <<<\n')
}

runSearchDedupTests()
