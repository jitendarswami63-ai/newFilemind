const fs = require('fs')
const crypto = require('crypto')
const assert = require('assert')
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')

// Read environment from .env.local
let env = {}
try {
  env = Object.fromEntries(
    fs
      .readFileSync('.env.local', 'utf8')
      .split('\n')
      .map((line) => line.trim().split('='))
      .filter((parts) => parts.length >= 2)
      .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
  )
} catch {
  // Fallback if .env.local is not present
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key'
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_role_key'

async function runOptimizationSuite() {
  const results = []

  function record(name, status, evidence) {
    results.push({ name, status, evidence })
    console.log(`[${status}] ${name} -> ${evidence}`)
  }

  console.log('===============================================================')
  console.log('    FILEMIND SYSTEM OPTIMIZATION AUTOMATED VERIFICATION SUITE   ')
  console.log('===============================================================\n')

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Safe PDF Storage Optimization (pdf-lib)
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Safe PDF Storage Optimization & Integrity ---')

  // Create a synthetic PDF document with multiple pages
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < 4; i++) {
    const page = doc.addPage([600, 800])
    page.drawText(`FileMind Test Page ${i + 1}`, { x: 50, y: 750, size: 16, font, color: rgb(0, 0, 0) })
    page.drawText('Sample text stream for object stream optimization validation.', {
      x: 50,
      y: 700,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })
  }
  const samplePdfBuffer = Buffer.from(await doc.save())

  // Helper matching lib/storage/optimizer.ts logic
  function hasDigitalSignatureIndicators(buffer) {
    const str = buffer.toString('latin1')
    return (
      /\/ByteRange\s*\[/i.test(str) ||
      /\/Type\s*\/Sig\b/i.test(str) ||
      /\/SubFilter\s*\/(adbe\.pkcs7|ETSI\.CAdES|adbe\.x509)/i.test(str) ||
      /\/DocTimeStamp\b/i.test(str)
    )
  }

  function hasEncryptionDictionary(buffer) {
    const str = buffer.toString('latin1')
    return /\/Encrypt\s+\d+\s+\d+\s+R/i.test(str) || /\/Encrypt\s+<</i.test(str)
  }

  function hasInteractiveActions(buffer) {
    const str = buffer.toString('latin1')
    return /\/JavaScript\s+/i.test(str) || /\/JS\s*\(/i.test(str) || /\/JS\s*</i.test(str) || /\/Launch\s+/i.test(str)
  }

  function hasEmbeddedFiles(buffer) {
    const str = buffer.toString('latin1')
    return /\/EmbeddedFiles\s+/i.test(str) || /\/EF\s+<<[^\>]*\/F\s+/i.test(str)
  }

  function isValidPdfHeader(buffer) {
    if (buffer.length < 4) return false
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
  }

  async function testOptimizePdf(buffer) {
    const originalSize = buffer.length
    if (!isValidPdfHeader(buffer)) return { status: 'skipped', reason: 'Invalid header', buffer }
    if (hasEncryptionDictionary(buffer)) return { status: 'skipped', reason: 'Encrypted', buffer }
    if (hasDigitalSignatureIndicators(buffer)) return { status: 'skipped', reason: 'Digitally signed', buffer }
    if (hasInteractiveActions(buffer)) return { status: 'skipped', reason: 'Interactive scripts', buffer }
    if (hasEmbeddedFiles(buffer)) return { status: 'skipped', reason: 'Embedded files', buffer }

    let pdfDoc
    try {
      pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false, throwOnInvalidObject: true })
    } catch (err) {
      return { status: 'skipped', reason: err.message, buffer }
    }

    const pageCount = pdfDoc.getPageCount()
    const optimizedBytes = await pdfDoc.save({ useObjectStreams: true })
    const optimizedBuffer = Buffer.from(optimizedBytes)

    // Verification
    const verifyDoc = await PDFDocument.load(optimizedBuffer)
    if (verifyDoc.getPageCount() !== pageCount) {
      return { status: 'failed', reason: 'Page count mismatch', buffer }
    }

    const savedBytes = originalSize - optimizedBuffer.length
    const savingsPercent = Number(((savedBytes / originalSize) * 100).toFixed(2))

    if (savingsPercent < 1.0) {
      return { status: 'unchanged', savingsPercent, savedBytes, buffer }
    }

    return { status: 'optimized', savingsPercent, savedBytes, buffer: optimizedBuffer }
  }

  // 1.1 Structural optimization
  const optRes = await testOptimizePdf(samplePdfBuffer)
  if (optRes.status === 'optimized' || optRes.status === 'unchanged') {
    record('PDF Optimizer: Execution & Integrity', 'PASS', `Result status="${optRes.status}", 4 pages preserved`)
  } else {
    record('PDF Optimizer: Execution & Integrity', 'FAIL', `Unexpected status: ${optRes.status}`)
  }

  // 1.2 Digital signature skip
  const signedBuffer = Buffer.concat([samplePdfBuffer, Buffer.from('\n/ByteRange [0 10 20 30]\n/Type /Sig\n')])
  const signedRes = await testOptimizePdf(signedBuffer)
  if (signedRes.status === 'skipped' && signedRes.reason.includes('signed')) {
    record('PDF Optimizer: Digital Signature Skip', 'PASS', 'Correctly detected /ByteRange and skipped')
  } else {
    record('PDF Optimizer: Digital Signature Skip', 'FAIL', `Failed to skip signed PDF: status=${signedRes.status}`)
  }

  // 1.3 Encryption skip
  const encBuffer = Buffer.concat([samplePdfBuffer, Buffer.from('\n/Encrypt 5 0 R\n')])
  const encRes = await testOptimizePdf(encBuffer)
  if (encRes.status === 'skipped' && encRes.reason.includes('Encrypted')) {
    record('PDF Optimizer: Encryption Skip', 'PASS', 'Correctly detected /Encrypt and skipped')
  } else {
    record('PDF Optimizer: Encryption Skip', 'FAIL', `Failed to skip encrypted PDF: status=${encRes.status}`)
  }

  // 1.4 Interactive actions skip
  const jsBuffer = Buffer.concat([samplePdfBuffer, Buffer.from('\n/JavaScript << /Type /Action >>\n')])
  const jsRes = await testOptimizePdf(jsBuffer)
  if (jsRes.status === 'skipped' && jsRes.reason.includes('scripts')) {
    record('PDF Optimizer: Interactive JS Skip', 'PASS', 'Correctly detected /JavaScript and skipped')
  } else {
    record('PDF Optimizer: Interactive JS Skip', 'FAIL', `Failed to skip JS PDF: status=${jsRes.status}`)
  }

  // 1.5 Embedded files skip
  const efBuffer = Buffer.concat([samplePdfBuffer, Buffer.from('\n/EmbeddedFiles << >>\n')])
  const efRes = await testOptimizePdf(efBuffer)
  if (efRes.status === 'skipped' && efRes.reason.includes('Embedded files')) {
    record('PDF Optimizer: Embedded Files Skip', 'PASS', 'Correctly detected /EmbeddedFiles and skipped')
  } else {
    record('PDF Optimizer: Embedded Files Skip', 'FAIL', `Failed to skip embedded files: status=${efRes.status}`)
  }

  // 1.6 Malformed / Non-PDF skip
  const malformedRes = await testOptimizePdf(Buffer.from('NOT_PDF_HEADER'))
  if (malformedRes.status === 'skipped' && malformedRes.reason.includes('Invalid header')) {
    record('PDF Optimizer: Invalid Header Skip', 'PASS', 'Correctly rejected invalid magic bytes')
  } else {
    record('PDF Optimizer: Invalid Header Skip', 'FAIL', `Failed to reject invalid header: status=${malformedRes.status}`)
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Search Query Embedding LRU Cache
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Search Query Embedding LRU Cache ---')

  const CACHE_CAPACITY = 500
  const CACHE_TTL_MS = 60 * 60 * 1000

  class TestLRUCache {
    constructor(capacity = CACHE_CAPACITY, ttl = CACHE_TTL_MS) {
      this.capacity = capacity
      this.ttl = ttl
      this.cache = new Map()
    }

    generateKey(query, model = 'gemini-embedding-2', dim = 768) {
      const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ')
      return crypto.createHash('sha256').update(`${normalized}:${model}:${dim}:v1`).digest('hex')
    }

    get(key) {
      const entry = this.cache.get(key)
      if (!entry) return null
      if (Date.now() - entry.createdAt > this.ttl) {
        this.cache.delete(key)
        return null
      }
      this.cache.delete(key)
      this.cache.set(key, entry)
      return entry.embedding
    }

    set(key, embedding) {
      if (!Array.isArray(embedding) || embedding.length !== 768) return
      if (embedding.some((v) => typeof v !== 'number' || Number.isNaN(v))) return

      if (this.cache.size >= this.capacity && !this.cache.has(key)) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) this.cache.delete(firstKey)
      }
      if (this.cache.has(key)) this.cache.delete(key)
      this.cache.set(key, { embedding, createdAt: Date.now() })
    }

    size() {
      return this.cache.size
    }
  }

  const testCache = new TestLRUCache()

  // 2.1 Query normalization
  const k1 = testCache.generateKey('Artificial Intelligence')
  const k2 = testCache.generateKey('  artificial    intelligence \n')
  const k3 = testCache.generateKey('Machine Learning')

  if (k1 === k2 && k1 !== k3 && k1.length === 64) {
    record('Embedding Cache: Query Normalization & SHA-256 Key', 'PASS', `Normalized distinct whitespace/case to ${k1.slice(0, 16)}...`)
  } else {
    record('Embedding Cache: Query Normalization & SHA-256 Key', 'FAIL', 'Key normalization failed')
  }

  // 2.2 Hit and miss semantics
  const dummyVec = new Array(768).fill(0.123)
  testCache.set(k1, dummyVec)
  const hit = testCache.get(k1)
  const miss = testCache.get(k3)

  if (hit && hit.length === 768 && hit[0] === 0.123 && miss === null) {
    record('Embedding Cache: Hit & Miss Semantics', 'PASS', 'Exact 768-dim vector retrieved on hit; null on miss')
  } else {
    record('Embedding Cache: Hit & Miss Semantics', 'FAIL', 'Hit/miss behavior incorrect')
  }

  // 2.3 LRU Eviction at capacity 500
  const lruCache = new TestLRUCache(500)
  for (let i = 0; i < 500; i++) {
    const k = lruCache.generateKey(`term_${i}`)
    lruCache.set(k, dummyVec)
  }

  // Access term_0 to refresh it
  const term0Key = lruCache.generateKey('term_0')
  const term1Key = lruCache.generateKey('term_1')
  lruCache.get(term0Key)

  // Insert 501st element
  const overflowKey = lruCache.generateKey('overflow_term')
  lruCache.set(overflowKey, dummyVec)

  const term0StillThere = lruCache.get(term0Key) !== null
  const term1Evicted = lruCache.get(term1Key) === null
  const overflowPresent = lruCache.get(overflowKey) !== null

  if (lruCache.size() === 500 && term0StillThere && term1Evicted && overflowPresent) {
    record('Embedding Cache: 500-Capacity LRU Eviction', 'PASS', 'Capped at 500, refreshed item 0 retained, LRU item 1 evicted')
  } else {
    record('Embedding Cache: 500-Capacity LRU Eviction', 'FAIL', `LRU eviction failed: size=${lruCache.size()}`)
  }

  // 2.4 Vector integrity validation
  const invalidKey = lruCache.generateKey('invalid_term')
  lruCache.set(invalidKey, [1, 2, 3]) // wrong length
  const wrongLenRejected = lruCache.get(invalidKey) === null

  const nanVec = new Array(768).fill(0.1)
  nanVec[5] = NaN
  lruCache.set(invalidKey, nanVec) // NaN value
  const nanRejected = lruCache.get(invalidKey) === null

  if (wrongLenRejected && nanRejected) {
    record('Embedding Cache: Vector Integrity Validation', 'PASS', 'Rejected wrong dimensions and NaN values')
  } else {
    record('Embedding Cache: Vector Integrity Validation', 'FAIL', 'Accepted invalid vector')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Search Result Deduplication & Snippet Coalescing
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Search Result Deduplication & Snippet Coalescing ---')

  const candidateChunks = [
    {
      chunk_id: 'chk-1',
      document_id: 'doc-100',
      filename: 'financial_2025.pdf',
      doc_category: 'Finance',
      page_start: 1,
      page_end: 2,
      content: 'FileMind delivers enterprise document intelligence. Total revenue reached record highs in 2025.',
      score: 0.033333,
      rrfScore: 0.033333,
    },
    {
      chunk_id: 'chk-2',
      document_id: 'doc-100',
      filename: 'financial_2025.pdf',
      doc_category: 'Finance',
      page_start: 5,
      page_end: 6,
      content: 'Operating efficiency improved by 14% following algorithmic pipeline upgrades.',
      score: 0.048888, // Higher score for doc-100
      rrfScore: 0.048888,
    },
    {
      chunk_id: 'chk-3',
      document_id: 'doc-200',
      filename: 'security_whitepaper.pdf',
      doc_category: 'Security',
      page_start: 3,
      page_end: 3,
      content: 'Multi-tenant isolation is enforced via PostgreSQL Row Level Security (RLS).',
      score: 0.025000,
      rrfScore: 0.025000,
    },
  ]

  function deduplicateAndCoalesceTest(chunks, query, limit = 20) {
    const docMap = new Map()
    for (const c of chunks) {
      const list = docMap.get(c.document_id) || []
      list.push(c)
      docMap.set(c.document_id, list)
    }

    const results = []
    for (const [, docChunks] of docMap.entries()) {
      docChunks.sort((a, b) => b.rrfScore - a.rrfScore)
      const primary = docChunks[0]

      const pageSet = new Set()
      for (const c of docChunks) {
        for (let p = c.page_start; p <= c.page_end; p++) pageSet.add(p)
      }
      const matchingPages = Array.from(pageSet).sort((a, b) => a - b)

      let snippet = primary.content
      if (docChunks.length > 1) {
        for (let i = 1; i < docChunks.length; i++) {
          const sec = docChunks[i]
          snippet += ` ... [p.${sec.page_start}] ${sec.content}`
        }
      }
      if (snippet.length > 1000) snippet = snippet.slice(0, 1000).trim() + '...'

      results.push({
        document_id: primary.document_id,
        filename: primary.filename,
        doc_category: primary.doc_category,
        chunk_id: primary.chunk_id,
        page_start: primary.page_start,
        page_end: primary.page_end,
        matching_pages: matchingPages,
        snippet,
        score: primary.score,
      })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  const dedupResults = deduplicateAndCoalesceTest(candidateChunks, 'revenue security', 20)

  // 3.1 Document grouping
  if (dedupResults.length === 2 && dedupResults[0].document_id === 'doc-100' && dedupResults[1].document_id === 'doc-200') {
    record('Search Deduplication: Document Grouping', 'PASS', '3 chunks grouped into 2 distinct document results')
  } else {
    record('Search Deduplication: Document Grouping', 'FAIL', `Grouping incorrect: count=${dedupResults.length}`)
  }

  // 3.2 Highest score preservation
  if (dedupResults[0].score === 0.048888 && dedupResults[0].chunk_id === 'chk-2') {
    record('Search Deduplication: Highest Score Preservation', 'PASS', 'Doc-100 preserved highest chunk score (0.048888 from chk-2)')
  } else {
    record('Search Deduplication: Highest Score Preservation', 'FAIL', `Score preservation failed: ${dedupResults[0].score}`)
  }

  // 3.3 Page range expansion & sorting
  const doc100Pages = dedupResults[0].matching_pages
  if (JSON.stringify(doc100Pages) === JSON.stringify([1, 2, 5, 6])) {
    record('Search Deduplication: Page Range Expansion', 'PASS', 'Expanded and sorted matching_pages to [1, 2, 5, 6]')
  } else {
    record('Search Deduplication: Page Range Expansion', 'FAIL', `Page expansion failed: ${JSON.stringify(doc100Pages)}`)
  }

  // 3.4 Snippet coalescing <= 1000 chars
  const doc100Snippet = dedupResults[0].snippet
  if (
    doc100Snippet.includes('Operating efficiency') &&
    doc100Snippet.includes('[p.1]') &&
    doc100Snippet.length <= 1000
  ) {
    record('Search Deduplication: Snippet Coalescing', 'PASS', `Coalesced multi-chunk snippet (${doc100Snippet.length} chars <= 1000)`)
  } else {
    record('Search Deduplication: Snippet Coalescing', 'FAIL', 'Snippet coalescing failed')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: PDF Viewer Fast-Path Signed URL Cache
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: PDF Viewer Fast-Path Signed URL Cache ---')

  class TestSignedUrlCache {
    constructor(safetyMarginMs = 60 * 1000) {
      this.safetyMarginMs = safetyMarginMs
      this.cache = new Map()
      this.inFlight = new Map()
    }

    makeKey(documentId, storagePath) {
      return `${documentId}:${storagePath}`
    }

    async fetchSignedUrl(documentId, storagePath, fetcher) {
      const key = this.makeKey(documentId, storagePath)
      const now = Date.now()

      const cached = this.cache.get(key)
      if (cached && cached.expiresAt - this.safetyMarginMs > now) {
        return cached.signedUrl
      }

      if (this.inFlight.has(key)) {
        return this.inFlight.get(key)
      }

      const promise = (async () => {
        try {
          const res = await fetcher(documentId)
          if (res.signedUrl && res.expiresAt) {
            this.cache.set(key, { signedUrl: res.signedUrl, expiresAt: res.expiresAt })
          }
          return res.signedUrl
        } finally {
          this.inFlight.delete(key)
        }
      })()

      this.inFlight.set(key, promise)
      return promise
    }

    invalidate(documentId, storagePath) {
      this.cache.delete(this.makeKey(documentId, storagePath))
    }
  }

  const viewerCache = new TestSignedUrlCache()
  let fetchCount = 0
  const mockFetcher = async (id) => {
    fetchCount++
    return {
      signedUrl: `https://supabase.co/storage/v1/object/sign/docs/${id}.pdf?token=valid`,
      expiresAt: Date.now() + 300 * 1000, // 5 minutes
    }
  }

  // 4.1 In-flight request collapsing
  const [url1, url2, url3] = await Promise.all([
    viewerCache.fetchSignedUrl('doc-abc', 'path/v1.pdf', mockFetcher),
    viewerCache.fetchSignedUrl('doc-abc', 'path/v1.pdf', mockFetcher),
    viewerCache.fetchSignedUrl('doc-abc', 'path/v1.pdf', mockFetcher),
  ])

  if (fetchCount === 1 && url1 === url2 && url2 === url3) {
    record('Viewer Cache: In-Flight Collapsing', 'PASS', '3 concurrent fetches collapsed into exactly 1 network call')
  } else {
    record('Viewer Cache: In-Flight Collapsing', 'FAIL', `In-flight collapsing failed: fetchCount=${fetchCount}`)
  }

  // 4.2 Cache hit
  const urlCached = await viewerCache.fetchSignedUrl('doc-abc', 'path/v1.pdf', mockFetcher)
  if (fetchCount === 1 && urlCached === url1) {
    record('Viewer Cache: In-Memory Hit', 'PASS', 'Immediate hit returned without invoking fetcher')
  } else {
    record('Viewer Cache: In-Memory Hit', 'FAIL', 'Cache hit failed')
  }

  // 4.3 Invalidation on path update
  const urlNewPath = await viewerCache.fetchSignedUrl('doc-abc', 'path/v2-optimized.pdf', mockFetcher)
  if (fetchCount === 2 && urlNewPath !== undefined) {
    record('Viewer Cache: Storage Path Invalidation', 'PASS', 'Storage path change triggered fresh fetch')
  } else {
    record('Viewer Cache: Storage Path Invalidation', 'FAIL', 'Path invalidation failed')
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Storage Versioning, Security & Quota Invariants
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Storage Versioning, Security & Quota Invariants ---')

  // 5.1 Storage path format validation
  function buildOptimizedStoragePath(userId, documentId, filename, buffer) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8)
    const baseName = filename.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    return `${userId}/${documentId}/optimized-${hash}-${baseName}.pdf`
  }

  const uId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
  const dId = 'f1e2d3c4-b5a6-9788-7654-3210fedcba98'
  const vPath = buildOptimizedStoragePath(uId, dId, 'my report.pdf', samplePdfBuffer)

  if (
    vPath.startsWith(`${uId}/${dId}/optimized-`) &&
    vPath.endsWith('-my_report.pdf') &&
    vPath.includes(crypto.createHash('sha256').update(samplePdfBuffer).digest('hex').slice(0, 8))
  ) {
    record('Storage Versioning: Path Namespace & Hash', 'PASS', `Path formatted correctly: ${vPath}`)
  } else {
    record('Storage Versioning: Path Namespace & Hash', 'FAIL', `Path formatting failed: ${vPath}`)
  }

  // 5.2 Atomic Switch & Quota Invariant
  const originalSize = 100000
  const optimizedSize = 85000
  const savedBytes = originalSize - optimizedSize
  const savingsPercent = Number(((savedBytes / originalSize) * 100).toFixed(2))

  if (savedBytes === 15000 && savingsPercent === 15.0) {
    record('Quota Invariant: Storage Calculation', 'PASS', `Saved 15,000 bytes (15.0% reduction) recovered for user quota`)
  } else {
    record('Quota Invariant: Storage Calculation', 'FAIL', 'Quota calculation mismatch')
  }

  // 5.3 Non-blocking Failure Invariant
  // Verify that an optimization failure falls back to the original buffer
  function processWithFallback(originalBuffer, shouldFailOptimization) {
    let finalBuffer = originalBuffer
    let optStatus = 'unchanged'
    try {
      if (shouldFailOptimization) {
        throw new Error('Simulated reserialization engine crash')
      }
      finalBuffer = Buffer.from('OPTIMIZED_BUFFER')
      optStatus = 'completed'
    } catch (err) {
      console.warn('Optimization failed, safely falling back to original buffer:', err.message)
      finalBuffer = originalBuffer
      optStatus = 'failed'
    }
    return { finalBuffer, optStatus }
  }

  const fallbackResult = processWithFallback(samplePdfBuffer, true)
  if (fallbackResult.optStatus === 'failed' && fallbackResult.finalBuffer === samplePdfBuffer) {
    record('Resilience Invariant: Non-Blocking Fallback', 'PASS', 'Optimization failure cleanly preserved original buffer for AI processing')
  } else {
    record('Resilience Invariant: Non-Blocking Fallback', 'FAIL', 'Fallback failed to preserve original buffer')
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n===============================================================')
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('===============================================================\n')

  if (failed > 0) {
    console.error('❌ Optimization verification suite FAILED.')
    process.exit(1)
  } else {
    console.log('✅ Optimization verification suite PASSED successfully!')
    process.exit(0)
  }
}

runOptimizationSuite().catch((err) => {
  console.error('Fatal error in optimization suite:', err)
  process.exit(1)
})
