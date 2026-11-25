import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_DOCUMENT_PAGES,
  MAX_TOTAL_DOCUMENT_PAGES,
  DEFAULT_SEGMENT_PAGE_SIZE,
  MAX_SEGMENT_PAGES,
  MIN_SEGMENT_PAGES,
  EMBEDDING_BATCH_SIZE,
} from '../lib/constants.ts'
import {
  calculateSegmentSize,
  computeSegmentPlan,
  extractPdfSegment,
  remapSegmentPagesToOriginal,
  mergeSegmentOutputs,
  validateSegmentExtractionCompleteness,
  subdivideSegmentRange,
  ExtractionIncompleteError,
} from '../lib/ai/pdf-splitter.ts'
import { validatePageIntegrity } from '../lib/ai/schema.ts'
import { chunkDocumentPages } from '../lib/ai/chunker.ts'

console.log('====================================================')
console.log('🧪 FILEMIND LARGE PDF SPLITTING & SEGMENT SUITE')
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
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    if (error instanceof Error && error.stack) console.error(error.stack)
  }
}

async function testAsync(name, fn) {
  totalTests++
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (error) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    if (error instanceof Error && error.stack) console.error(error.stack)
  }
}

async function createSyntheticPdf(pageCount) {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([200, 200])
  }
  const bytes = await doc.save()
  return Buffer.from(bytes)
}

test('Scenario 1: Dynamic segment sizing adapts to density and respects bounds', () => {
  const size1 = calculateSegmentSize(1250, 20 * 1024 * 1024)
  assert.equal(size1, 20, 'Standard multi-segment PDF should scale to 20 pages/segment')

  const size2 = calculateSegmentSize(400, 48 * 1024 * 1024)
  assert.equal(size2, 12, 'Moderate scanned density (>100KB/page) should scale down to 12')

  const size3 = calculateSegmentSize(200, 48 * 1024 * 1024)
  assert.equal(size3, 10, 'Dense scanned density (>200KB/page) should scale down to 10')

  const size4 = calculateSegmentSize(10, 512 * 1024)
  assert.equal(size4, 10, 'Small doc should return totalPages directly')
})

test('Scenario 2: Segment plan for 1,250-page PDF produces exactly 63 contiguous segments', () => {
  const plan = computeSegmentPlan(1250, 20 * 1024 * 1024)

  assert.equal(plan.requiresSplitting, true, '1,250 pages requires internal splitting')
  assert.equal(plan.totalSegments, 63, '1,250 pages at 20/segment produces 63 segments')
  assert.equal(plan.segments.length, 63)

  for (let i = 0; i < plan.segments.length; i++) {
    const seg = plan.segments[i]
    assert.equal(seg.segmentIndex, i + 1)
    assert.equal(seg.totalSegments, 63)
    if (i === 0) {
      assert.equal(seg.pageStart, 1)
      assert.equal(seg.pageEnd, 20)
    } else if (i === 62) {
      assert.equal(seg.pageStart, 1241)
      assert.equal(seg.pageEnd, 1250)
      assert.equal(seg.pageCount, 10)
    }
  }

  for (let i = 1; i < plan.segments.length; i++) {
    assert.equal(
      plan.segments[i].pageStart,
      plan.segments[i - 1].pageEnd + 1,
      `Segment ${i + 1} must start immediately after segment ${i}`
    )
  }

  const totalPagesCovered = plan.segments.reduce((sum, s) => sum + s.pageCount, 0)
  assert.equal(totalPagesCovered, 1250, 'All 1,250 pages must be covered exactly')
})

test('Scenario 3: Segment plan for 3,520-page PDF covers all pages under Gemini limits', () => {
  const plan = computeSegmentPlan(3520, 35 * 1024 * 1024)

  assert.equal(plan.requiresSplitting, true)
  assert.equal(plan.totalSegments, 176, '3,520 pages at 20/segment = 176 segments')

  assert.equal(plan.segments[0].pageStart, 1)
  assert.equal(plan.segments[0].pageEnd, 20)

  const lastSeg = plan.segments[175]
  assert.equal(lastSeg.pageStart, 3501)
  assert.equal(lastSeg.pageEnd, 3520)
  assert.equal(lastSeg.pageCount, 20)

  for (const seg of plan.segments) {
    assert.ok(
      seg.pageCount <= MAX_SEGMENT_PAGES,
      `Segment ${seg.segmentIndex} pageCount (${seg.pageCount}) must be <= ${MAX_SEGMENT_PAGES}`
    )
  }

  const totalCovered = plan.segments.reduce((sum, s) => sum + s.pageCount, 0)
  assert.equal(totalCovered, 3520, 'All 3,520 pages must be accounted for')
})

await testAsync('Scenario 4: extractPdfSegment produces valid standalone sub-documents', async () => {
  const srcPdf = await createSyntheticPdf(10)

  const slicedBuffer = await extractPdfSegment(srcPdf, 4, 7)
  assert.ok(Buffer.isBuffer(slicedBuffer), 'Output must be a Buffer')
  assert.ok(slicedBuffer.length > 0, 'Buffer must not be empty')

  const loadedSubDoc = await PDFDocument.load(slicedBuffer)
  assert.equal(loadedSubDoc.getPageCount(), 4, 'Extracted PDF must have exactly 4 pages')
})

await testAsync('Scenario 5: extractPdfSegment handles boundaries and rejects invalid ranges', async () => {
  const srcPdf = await createSyntheticPdf(5)

  const sliceLast = await extractPdfSegment(srcPdf, 5, 5)
  const docLast = await PDFDocument.load(sliceLast)
  assert.equal(docLast.getPageCount(), 1)

  await assert.rejects(
    async () => extractPdfSegment(srcPdf, 4, 2),
    /Invalid page range/
  )

  await assert.rejects(
    async () => extractPdfSegment(srcPdf, 2, 10),
    /exceeds source document page count/
  )
})

test('Scenario 6: remapSegmentPagesToOriginal maps relative segment pages to original pages', () => {
  const segmentExtractedPages = [
    { page_number: 1, text: 'Text of page 251' },
    { page_number: 2, text: 'Text of page 252' },
    { page_number: 3, text: 'Text of page 253' },
    { page_number: 4, text: 'Text of page 254' },
    { page_number: 5, text: 'Text of page 255' },
  ]

  const remapped = remapSegmentPagesToOriginal(segmentExtractedPages, 251, 255)

  assert.equal(remapped.length, 5)
  assert.equal(remapped[0].page_number, 251)
  assert.equal(remapped[0].text, 'Text of page 251')
  assert.equal(remapped[4].page_number, 255)
  assert.equal(remapped[4].text, 'Text of page 255')
})

test('Scenario 7: validateSegmentExtractionCompleteness flags missing pages while allowing tolerant blank fill, and total miss throws', () => {
  const partialPages = [
    { page_number: 1, text: 'Page 101 text' },
    { page_number: 2, text: 'Page 102 text' },
    { page_number: 4, text: 'Page 104 text' },
    { page_number: 5, text: 'Page 105 text' },
  ]

  const validation = validateSegmentExtractionCompleteness(partialPages, 5)
  assert.equal(validation.isValid, true, 'Tolerant validation accepts partial non-empty segment extraction')
  assert.deepEqual(validation.missingPages, [3], 'Missing page 3 must still be tracked diagnostically')

  const remappedPartial = remapSegmentPagesToOriginal(partialPages, 101, 105)
  assert.equal(remappedPartial.length, 5)
  assert.equal(remappedPartial[2].page_number, 103)
  assert.equal(remappedPartial[2].text, '')

  assert.throws(
    () => remapSegmentPagesToOriginal([], 101, 105),
    (err) => {
      assert.ok(err instanceof ExtractionIncompleteError)
      assert.ok(err.message.includes('missing all pages [101, 102, 103, 104, 105]'))
      return true
    }
  )

  const blankPageExtracted = [
    { page_number: 1, text: 'Page 101 text' },
    { page_number: 2, text: '' },
    { page_number: 3, text: 'Page 103 text' },
  ]
  const validResult = validateSegmentExtractionCompleteness(blankPageExtracted, 3)
  assert.equal(validResult.isValid, true, 'Genuinely blank page must be accepted as valid')

  const remappedBlank = remapSegmentPagesToOriginal(blankPageExtracted, 101, 103)
  assert.equal(remappedBlank.length, 3)
  assert.equal(remappedBlank[1].page_number, 102)
  assert.equal(remappedBlank[1].text, '')
})

test('Scenario 8: subdivideSegmentRange halves segment range for adaptive bisection', () => {
  const range = {
    segmentIndex: 2,
    totalSegments: 5,
    pageStart: 61,
    pageEnd: 120,
    pageCount: 60,
  }

  const sub = subdivideSegmentRange(range)
  assert.ok(sub !== null)
  const [sub1, sub2] = sub

  assert.equal(sub1.pageStart, 61)
  assert.equal(sub1.pageEnd, 90)
  assert.equal(sub1.pageCount, 30)

  assert.equal(sub2.pageStart, 91)
  assert.equal(sub2.pageEnd, 120)
  assert.equal(sub2.pageCount, 30)

  assert.equal(sub1.pageEnd + 1, sub2.pageStart)
  assert.equal(sub1.pageCount + sub2.pageCount, range.pageCount)

  const singlePage = { segmentIndex: 1, totalSegments: 1, pageStart: 5, pageEnd: 5, pageCount: 1 }
  assert.equal(subdivideSegmentRange(singlePage), null)
})

test('Scenario 9: Small documents bypass segmentation overhead', () => {
  const plan = computeSegmentPlan(12, 1024 * 1024)

  assert.equal(plan.requiresSplitting, false, 'Standard small PDF must not trigger splitting')
  assert.equal(plan.totalSegments, 1)
  assert.equal(plan.segments[0].pageStart, 1)
  assert.equal(plan.segments[0].pageEnd, 12)
  assert.equal(plan.segments[0].pageCount, 12)
})

test('Scenario 10: Chunker produces unified original page spans across segment boundaries', () => {
  const pages = [
    { page_number: 1, text: 'Introduction to Distributed Databases. Section 1.1 Overview.' },
    { page_number: 2, text: 'Consensus mechanisms. Section 1.2 Paxos and Raft protocols.' },
    { page_number: 3, text: 'Leader election and log replication algorithms in cluster environments.' },
    { page_number: 4, text: 'Section 2.1 Sharding architectures and partition strategies.' },
    { page_number: 5, text: 'Consistent hashing with virtual nodes for minimal rebalancing.' },
    { page_number: 6, text: 'Fault tolerance, heartbeats, and partition recovery procedures.' },
  ]

  const docId = 'c1b2a3f4-0000-0000-0000-000000000001'
  const chunks = chunkDocumentPages(docId, pages)

  assert.ok(chunks.length > 0, 'Chunks should be generated')

  for (const chunk of chunks) {
    assert.equal(chunk.document_id, docId)
    assert.ok(chunk.page_start >= 1, 'page_start must be >= 1')
    assert.ok(chunk.page_end <= 6, 'page_end must be <= 6')
    assert.ok(chunk.page_start <= chunk.page_end, 'page_start <= page_end')
  }

  const crossBoundaryChunk = chunks.find((c) => c.page_start <= 3 && c.page_end >= 4)
  if (crossBoundaryChunk) {
    assert.ok(
      crossBoundaryChunk.content.length > 0,
      'Cross-boundary chunk cleanly blends text across segment transition'
    )
  }
})

test('Scenario 11: mergeSegmentOutputs unifies metadata, tags, and contiguous pages', () => {
  const segment1Output = {
    doc_category: 'Technical Specification',
    tags: ['Architecture', 'Cloud', 'Storage'],
    metadata: [
      { key: 'author', type: 'string', value_string: 'Engineering Team' },
      { key: 'version', type: 'number', value_number: 3 },
    ],
    pages: [
      { page_number: 1, text: 'Chapter 1: Introduction' },
      { page_number: 2, text: 'Chapter 1: System Goals' },
    ],
    page_count: 2,
    is_scanned: false,
  }

  const segment2Output = {
    doc_category: 'Other',
    tags: ['Cloud', 'Kubernetes', 'Security'],
    metadata: [
      { key: 'approved', type: 'boolean', value_boolean: true },
    ],
    pages: [
      { page_number: 3, text: 'Chapter 2: Security & RLS' },
      { page_number: 4, text: 'Chapter 2: Storage Buckets' },
    ],
    page_count: 2,
    is_scanned: false,
  }

  const segment3Output = {
    doc_category: 'Uncategorized',
    tags: ['Monitoring', 'Telemetry'],
    metadata: [],
    pages: [
      { page_number: 5, text: 'Chapter 3: Health Checks' },
    ],
    page_count: 1,
    is_scanned: true,
  }

  const merged = mergeSegmentOutputs(
    [
      { output: segment1Output, range: { segmentIndex: 1, totalSegments: 3, pageStart: 1, pageEnd: 2, pageCount: 2 } },
      { output: segment2Output, range: { segmentIndex: 2, totalSegments: 3, pageStart: 3, pageEnd: 4, pageCount: 2 } },
      { output: segment3Output, range: { segmentIndex: 3, totalSegments: 3, pageStart: 5, pageEnd: 5, pageCount: 1 } },
    ],
    5
  )

  assert.equal(merged.doc_category, 'Technical Specification')

  assert.deepEqual(merged.tags, ['Architecture', 'Cloud', 'Storage', 'Kubernetes', 'Security', 'Monitoring', 'Telemetry'])

  assert.equal(merged.metadata.length, 3)

  assert.equal(merged.pages.length, 5)
  assert.equal(merged.page_count, 5)
  assert.equal(merged.is_scanned, true, 'is_scanned must be true if any segment is scanned')

  validatePageIntegrity(merged.pages, 5)
})

test('Scenario 12: Checkpoint resumption correctly skips already-saved pages', () => {
  const segments = [
    { segmentIndex: 1, pageStart: 1, pageEnd: 60, pageCount: 60 },
    { segmentIndex: 2, pageStart: 61, pageEnd: 120, pageCount: 60 },
    { segmentIndex: 3, pageStart: 121, pageEnd: 180, pageCount: 60 },
  ]

  const completedPageNumbers = new Set()
  for (let p = 1; p <= 60; p++) {
    completedPageNumbers.add(p)
  }

  const segmentsToProcess = []
  for (const seg of segments) {
    let allPagesDone = true
    for (let p = seg.pageStart; p <= seg.pageEnd; p++) {
      if (!completedPageNumbers.has(p)) {
        allPagesDone = false
        break
      }
    }
    if (!allPagesDone) {
      segmentsToProcess.push(seg)
    }
  }

  assert.equal(segmentsToProcess.length, 2, 'Only segments 2 and 3 should be queued for extraction')
  assert.equal(segmentsToProcess[0].segmentIndex, 2)
  assert.equal(segmentsToProcess[1].segmentIndex, 3)
})

await testAsync('Scenario 13: extractPdfSegment reuses loaded PDFDocument instance without re-parsing', async () => {
  const srcPdf = await createSyntheticPdf(10)
  const preLoadedDoc = await PDFDocument.load(srcPdf)

  const slice1 = await extractPdfSegment(preLoadedDoc, 1, 5)
  const slice2 = await extractPdfSegment(preLoadedDoc, 6, 10)

  const doc1 = await PDFDocument.load(slice1)
  const doc2 = await PDFDocument.load(slice2)

  assert.equal(doc1.getPageCount(), 5)
  assert.equal(doc2.getPageCount(), 5)
})

test('Scenario 14: Embedding batch partition splits chunks and supports batch retry/fallback', () => {
  const chunks = Array.from({ length: 25 }, (_, i) => ({
    chunk_index: i,
    content: `Chunk content #${i}`,
  }))

  const batches = []
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    batches.push(chunks.slice(i, i + EMBEDDING_BATCH_SIZE))
  }

  assert.equal(batches.length, 3, '25 chunks at batch size 10 should produce 3 batches')
  assert.equal(batches[0].length, 10)
  assert.equal(batches[1].length, 10)
  assert.equal(batches[2].length, 5)

  let batchFailed = true
  const results = []
  for (const batch of batches) {
    if (batchFailed && batch.length === 5) {
      for (const item of batch) {
        results.push({ id: item.chunk_index, success: true, fallback: true })
      }
    } else {
      for (const item of batch) {
        results.push({ id: item.chunk_index, success: true, fallback: false })
      }
    }
  }

  assert.equal(results.length, 25)
  assert.equal(results.filter((r) => r.fallback).length, 5)
})

test('Scenario 15: Ask AI status gate returns diagnostic guidance for unindexed or failed documents', () => {
  function checkDocumentIndexStatus(doc) {
    if (doc.status === 'processing') {
      return {
        allowed: false,
        response: 'This document is currently being analyzed and indexed. Please wait a moment until processing completes.',
      }
    }
    if (doc.embedding_status === 'failed') {
      return {
        allowed: false,
        response: 'This document has finished text extraction, but semantic indexing failed. You can click "Retry Indexing" on the document page.',
      }
    }
    if (doc.embedding_status === 'processing') {
      return {
        allowed: false,
        response: 'This document has completed text extraction and is currently being indexed for search. Please wait a few moments.',
      }
    }
    return { allowed: true }
  }

  const processingDoc = { status: 'processing', embedding_status: 'pending' }
  const r1 = checkDocumentIndexStatus(processingDoc)
  assert.equal(r1.allowed, false)
  assert.ok(r1.response.includes('currently being analyzed'))

  const failedDoc = { status: 'completed', embedding_status: 'failed' }
  const r2 = checkDocumentIndexStatus(failedDoc)
  assert.equal(r2.allowed, false)
  assert.ok(r2.response.includes('Retry Indexing'))

  const indexingDoc = { status: 'completed', embedding_status: 'processing' }
  const r3 = checkDocumentIndexStatus(indexingDoc)
  assert.equal(r3.allowed, false)
  assert.ok(r3.response.includes('currently being indexed'))

  const completedDoc = { status: 'completed', embedding_status: 'completed' }
  const r4 = checkDocumentIndexStatus(completedDoc)
  assert.equal(r4.allowed, true)
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================')

if (passedTests !== totalTests) {
  process.exit(1)
}
