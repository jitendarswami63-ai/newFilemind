import assert from 'node:assert/strict'
import {
  fuseAndFilterSearchResults,
  DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD,
  extractIdentifiers,
  createBoundedSnippet,
} from '../lib/search/search-fusion.ts'

console.log('====================================================')
console.log('🧪 FILEMIND HYBRID SEARCH RELEVANCE VERIFICATION SUITE')
console.log('====================================================\n')

let passedTests = 0
let totalTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (error) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
  }
}

test('Scenario 1: Query "economics" returns strictly relevant document', () => {
  const query = 'economics'

  const semanticCandidates = [
    {
      chunk_id: 'chk-ee-1',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 1,
      page_end: 1,
      content: 'Economics is the study of how society allocates its scarce resources.',
      similarity: 0.74,
    },
    {
      chunk_id: 'chk-ee-2',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 2,
      page_end: 2,
      content: 'Microeconomics focuses on individual decision-making units such as households and firms.',
      similarity: 0.71,
    },
    {
      chunk_id: 'chk-ee-3',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 3,
      page_end: 4,
      content: 'Macroeconomics examines economy-wide phenomena including inflation and GDP.',
      similarity: 0.70,
    },
    {
      chunk_id: 'chk-ee-4',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 5,
      page_end: 5,
      content: 'Supply and demand curves determine equilibrium market prices.',
      similarity: 0.69,
    },
    {
      chunk_id: 'chk-ee-5',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 8,
      page_end: 8,
      content: 'Summary of engineering economics and project cost estimations.',
      similarity: 0.71,
    },
    {
      chunk_id: 'chk-exam-1',
      document_id: 'doc-exam',
      filename: 'NOC26GE83S1281125017 (1).pdf',
      doc_category: 'Identity',
      page_start: 1,
      page_end: 1,
      content: 'Candidates must adhere to the formal dress code. No footwear with thick soles allowed in examination hall.',
      similarity: 0.59,
    },
    {
      chunk_id: 'chk-exam-2',
      document_id: 'doc-exam',
      filename: 'NOC26GE83S1281125017 (1).pdf',
      doc_category: 'Identity',
      page_start: 1,
      page_end: 1,
      content: 'Reporting time is 08:00 AM sharp. Bring original valid photo identity card.',
      similarity: 0.58,
    },
    {
      chunk_id: 'chk-pres-1',
      document_id: 'doc-pres',
      filename: 'FileMind_Project_Presentation_Final.pdf',
      doc_category: 'Presentation',
      page_start: 1,
      page_end: 2,
      content: 'FileMind: Intelligent local-first PDF indexing and multi-tier vector processing pipeline.',
      similarity: 0.58,
    },
    {
      chunk_id: 'chk-pres-2',
      document_id: 'doc-pres',
      filename: 'FileMind_Project_Presentation_Final.pdf',
      doc_category: 'Presentation',
      page_start: 3,
      page_end: 3,
      content: 'Architecture overview of client-side optimization and serverless vector search.',
      similarity: 0.57,
    },
  ]

  const lexicalCandidates = [
    {
      chunk_id: 'chk-ee-1',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 1,
      page_end: 1,
      content: 'Economics is the study of how society allocates its scarce resources.',
      rank_score: 0.08,
      is_exact_match: true,
    },
    {
      chunk_id: 'chk-ee-2',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 2,
      page_end: 2,
      content: 'Microeconomics focuses on individual decision-making units such as households and firms.',
      rank_score: 0.06,
      is_exact_match: false,
    },
    {
      chunk_id: 'chk-ee-3',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 3,
      page_end: 4,
      content: 'Macroeconomics examines economy-wide phenomena including inflation and GDP.',
      rank_score: 0.05,
      is_exact_match: false,
    },
    {
      chunk_id: 'chk-ee-5',
      document_id: 'doc-ee',
      filename: 'Module 1 EE.pdf',
      doc_category: 'Textbook',
      page_start: 8,
      page_end: 8,
      content: 'Summary of engineering economics and project cost estimations.',
      rank_score: 0.04,
      is_exact_match: true,
    },
  ]

  const results = fuseAndFilterSearchResults(semanticCandidates, lexicalCandidates, query)

  assert.equal(results.length, 1, `Expected exactly 1 document result, got ${results.length}`)
  assert.equal(results[0].document_id, 'doc-ee', 'Expected Module 1 EE.pdf')
  assert.equal(results[0].filename, 'Module 1 EE.pdf')

  const returnedFilenames = results.map((r) => r.filename)
  assert.ok(!returnedFilenames.includes('NOC26GE83S1281125017 (1).pdf'), 'Exam card should not appear')
  assert.ok(!returnedFilenames.includes('FileMind_Project_Presentation_Final.pdf'), 'Presentation should not appear')

  assert.deepEqual(results[0].matching_pages, [1, 2, 3, 4, 5, 8])
})

test('Scenario 2: Lexical-only matches (e.g. invoice ID) are never discarded by similarity threshold', () => {
  const query = 'INV-2026-990X'

  const semanticCandidates = [
    {
      chunk_id: 'chk-unrelated',
      document_id: 'doc-unrelated',
      filename: 'random_notes.pdf',
      page_start: 1,
      page_end: 1,
      content: 'Random office meeting notes from last week.',
      similarity: 0.15,
    },
  ]

  const lexicalCandidates = [
    {
      chunk_id: 'chk-inv-1',
      document_id: 'doc-inv',
      filename: 'Invoice_March2026.pdf',
      doc_category: 'Invoices',
      page_start: 1,
      page_end: 1,
      content: 'Invoice Reference Number: INV-2026-990X. Total Amount Due: $1,450.00.',
      rank_score: 0.12,
      is_exact_match: true,
    },
  ]

  const results = fuseAndFilterSearchResults(semanticCandidates, lexicalCandidates, query)

  assert.equal(results.length, 1, 'Expected 1 result')
  assert.equal(results[0].document_id, 'doc-inv')
  assert.equal(results[0].filename, 'Invoice_March2026.pdf')
  assert.ok(results[0].score >= 0.05, `Score should include exact match boost (got ${results[0].score})`)
})

test('Scenario 3: High-confidence semantic-only matches (similarity >= 0.50) are retained', () => {
  const query = 'fiscal policy and national debt'

  const semanticCandidates = [
    {
      chunk_id: 'chk-macro-1',
      document_id: 'doc-macro',
      filename: 'macroeconomic_theory.pdf',
      page_start: 14,
      page_end: 15,
      content: 'Government budgetary deficits require issuing sovereign bonds, expanding public obligations.',
      similarity: 0.67,
    },
  ]

  const lexicalCandidates = []

  const results = fuseAndFilterSearchResults(semanticCandidates, lexicalCandidates, query)

  assert.equal(results.length, 1, 'High confidence semantic match must be retained')
  assert.equal(results[0].document_id, 'doc-macro')
  assert.equal(results[0].filename, 'macroeconomic_theory.pdf')
})

test('Scenario 4: Low-confidence semantic-only matches (similarity < 0.50) are filtered out', () => {
  const query = 'quantum computing entanglement'

  const semanticCandidates = [
    {
      chunk_id: 'chk-noise-1',
      document_id: 'doc-noise',
      filename: 'grocery_shopping_list.pdf',
      page_start: 1,
      page_end: 1,
      content: 'Apples, oranges, milk, bread, butter.',
      similarity: 0.34,
    },
  ]

  const lexicalCandidates = []

  const results = fuseAndFilterSearchResults(semanticCandidates, lexicalCandidates, query)

  assert.equal(results.length, 0, 'Low-confidence semantic-only noise must be discarded')
})

test('Scenario 5: Exact phrase match ranks above partial/indirect semantic match', () => {
  const query = 'carbon footprint reduction'

  const semanticCandidates = [
    {
      chunk_id: 'chk-generic',
      document_id: 'doc-generic',
      filename: 'sustainability_goals.pdf',
      page_start: 1,
      page_end: 1,
      content: 'Our corporate responsibility initiatives focus on reducing environmental impact and waste.',
      similarity: 0.65,
    },
    {
      chunk_id: 'chk-exact',
      document_id: 'doc-exact',
      filename: 'annual_green_report.pdf',
      page_start: 4,
      page_end: 4,
      content: 'Our targeted carbon footprint reduction reached 25% across all manufacturing facilities.',
      similarity: 0.58,
    },
  ]

  const lexicalCandidates = [
    {
      chunk_id: 'chk-exact',
      document_id: 'doc-exact',
      filename: 'annual_green_report.pdf',
      page_start: 4,
      page_end: 4,
      content: 'Our targeted carbon footprint reduction reached 25% across all manufacturing facilities.',
      is_exact_match: true,
      rank_score: 0.1,
    },
  ]

  const results = fuseAndFilterSearchResults(semanticCandidates, lexicalCandidates, query)

  assert.equal(results.length, 2)
  assert.equal(results[0].document_id, 'doc-exact', 'Exact match must rank 1st due to dual-channel and exact boost')
  assert.equal(results[1].document_id, 'doc-generic', 'Generic semantic match ranks 2nd')
  assert.ok(results[0].score > results[1].score, 'Exact match score must be strictly greater than generic match score')
})

test('Scenario 6: Caller requesting minSimilarity: 0 retains legacy unthresholded behavior', () => {
  const query = 'experimental query'

  const semanticCandidates = [
    {
      chunk_id: 'chk-low-1',
      document_id: 'doc-low',
      filename: 'archived_log.pdf',
      page_start: 1,
      page_end: 1,
      content: 'Archived system logs from server node 4.',
      similarity: 0.22,
    },
  ]

  const defaultResults = fuseAndFilterSearchResults(semanticCandidates, [], query)
  assert.equal(defaultResults.length, 0, 'Filtered under default threshold')

  const overrideResults = fuseAndFilterSearchResults(semanticCandidates, [], query, { minSimilarity: 0 })
  assert.equal(overrideResults.length, 1, 'Retained when minSimilarity: 0 is explicitly specified')
  assert.equal(overrideResults[0].document_id, 'doc-low')
})

test('Scenario 7: Document aggregation collapses multiple chunks under primary chunk', () => {
  const query = 'algorithmic optimization'

  const semanticCandidates = [
    {
      chunk_id: 'chk-opt-1',
      document_id: 'doc-algo',
      filename: 'algorithms.pdf',
      page_start: 1,
      page_end: 2,
      content: 'Introduction to algorithmic optimization techniques.',
      similarity: 0.68,
    },
    {
      chunk_id: 'chk-opt-2',
      document_id: 'doc-algo',
      filename: 'algorithms.pdf',
      page_start: 5,
      page_end: 6,
      content: 'Advanced algorithmic optimization using dynamic programming and graph heuristics.',
      similarity: 0.75,
    },
    {
      chunk_id: 'chk-opt-3',
      document_id: 'doc-algo',
      filename: 'algorithms.pdf',
      page_start: 10,
      page_end: 10,
      content: 'Benchmarking runtime performance across varying optimization levels.',
      similarity: 0.67,
    },
  ]

  const results = fuseAndFilterSearchResults(semanticCandidates, [], query)

  assert.equal(results.length, 1, 'Must collapse 3 chunks into 1 document entry')
  assert.equal(results[0].chunk_id, 'chk-opt-2', 'Primary chunk must be the highest scoring chunk')
  assert.deepEqual(results[0].matching_pages, [1, 2, 5, 6, 10], 'All matching pages must be aggregated and sorted')
  assert.ok(results[0].snippet.includes('Advanced algorithmic optimization'), 'Snippet must lead with primary chunk text')
})

test('Scenario 8: Empty or blank inputs return empty array safely', () => {
  const emptyQueryResults = fuseAndFilterSearchResults([], [], '   ')
  assert.deepEqual(emptyQueryResults, [], 'Blank query returns empty array')

  const noCandidatesResults = fuseAndFilterSearchResults([], [], 'valid query')
  assert.deepEqual(noCandidatesResults, [], 'No candidates returns empty array')

  const subthresholdResults = fuseAndFilterSearchResults(
    [
      {
        chunk_id: 'c1',
        document_id: 'd1',
        filename: 'f1.pdf',
        page_start: 1,
        page_end: 1,
        content: 'completely irrelevant content',
        similarity: 0.1,
      },
    ],
    [],
    'machine learning'
  )
  assert.deepEqual(subthresholdResults, [], 'Subthreshold candidates return empty array')
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================')

if (passedTests !== totalTests) {
  process.exit(1)
}
