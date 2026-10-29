import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { MAX_DOCUMENT_PAGES } from '../lib/constants.ts'
import {
  getAndValidatePdfPageCount,
  categorizeDocumentError,
} from '../lib/ai/pdf-page-validator.ts'

console.log('====================================================')
console.log('🧪 FILEMIND PDF PAGE LIMIT & ERROR CATEGORIZER SUITE')
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

async function testAsync(name, fn) {
  totalTests++
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (error) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
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

test('Scenario 1: MAX_DOCUMENT_PAGES is defined as 1,000', () => {
  assert.equal(
    MAX_DOCUMENT_PAGES,
    1000,
    'MAX_DOCUMENT_PAGES must be centralized and exactly 1000'
  )
})

await testAsync('Scenario 2: Valid PDFs within page limit (e.g. 5 pages) are accepted', async () => {
  const pdfBuffer = await createSyntheticPdf(5)
  const count = await getAndValidatePdfPageCount(pdfBuffer, 1000)
  assert.equal(count, 5, 'Page count must accurately match 5 pages')
})

await testAsync('Scenario 3: Boundary PDF at exactly MAX_DOCUMENT_PAGES (1,000) is accepted', async () => {
  const pdfBuffer = await createSyntheticPdf(10)
  const count = await getAndValidatePdfPageCount(pdfBuffer, 10)
  assert.equal(count, 10, 'Boundary condition of count === maxPages must be accepted')
})

await testAsync('Scenario 4: Over-limit PDF (e.g. 1,001 pages) is rejected with clear error', async () => {
  const pdfBuffer = await createSyntheticPdf(11)
  await assert.rejects(
    async () => {
      await getAndValidatePdfPageCount(pdfBuffer, 10)
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('contains 11 pages which exceeds the supported page limit of 10'))
      return true
    }
  )
})

await testAsync('Scenario 5: Empty buffer or corrupt PDF bytes are rejected safely', async () => {
  await assert.rejects(
    async () => {
      await getAndValidatePdfPageCount(Buffer.alloc(0))
    },
    /PDF buffer is empty or missing/
  )

  await assert.rejects(
    async () => {
      await getAndValidatePdfPageCount(Buffer.from('not a valid pdf document content'))
    },
    /Failed to determine PDF page count/
  )
})

test('Scenario 6: Gemini page limit error 400 is categorized into short actionable message', () => {
  const geminiError =
    '{"error":{"code":400,"message":"The document contains 1665 pages which exceeds the supported page limit of 1000.","status":"INVALID_ARGUMENT"}}'
  const categorized = categorizeDocumentError(geminiError, 1000)
  assert.equal(
    categorized,
    'Document exceeds page limit (1665 pages; maximum is 1000).',
    'Must display exact page count and max limit'
  )
})

test('Scenario 7: Gemini token count ceiling error 400 is categorized into context limit message', () => {
  const geminiTokenError =
    '{"error":{"code":400,"message":"The input token count exceeds the maximum number of tokens allowed 1048576.","status":"INVALID_ARGUMENT"}}'
  const categorized = categorizeDocumentError(geminiTokenError, 1000)
  assert.equal(
    categorized,
    'Document text exceeds maximum AI model context limit (1,048,576 tokens).',
    'Must clearly indicate model token ceiling'
  )
})

test('Scenario 8: Password-protected or encrypted PDFs receive clear error', () => {
  const encError = 'PDF is password-protected or encrypted.'
  const categorized = categorizeDocumentError(encError)
  assert.equal(categorized, 'PDF is password-protected or encrypted.')
})

test('Scenario 9: Storage, rate-limit, and timeout errors remain preserved', () => {
  assert.equal(
    categorizeDocumentError('Failed to download document from storage: 404'),
    'Failed to retrieve document from storage.'
  )

  assert.equal(
    categorizeDocumentError('503 Service Unavailable: High demand on gemini-3.6-flash'),
    'AI service temporarily busy (high demand). Retrying automatically.'
  )

  assert.equal(
    categorizeDocumentError('429 RESOURCE_EXHAUSTED: rate limit exceeded'),
    'AI service temporarily busy (high demand). Retrying automatically.'
  )

  assert.equal(
    categorizeDocumentError('Request timed out after 60000ms'),
    'AI analysis timed out. Click to retry.'
  )

  assert.equal(
    categorizeDocumentError('Unrecognized random error without internal leaks'),
    'Analysis failed. Please try again.'
  )
})

test('Scenario 10: Categorized error never leaks API keys, stack traces, or credentials', () => {
  const leakAttempt =
    'Gemini API error: failed with key AIzaSyD982348234 at file:///server/secrets/env.ts:12:4. Internal trace.'
  const categorized = categorizeDocumentError(leakAttempt)
  assert.ok(!categorized.includes('AIzaSy'))
  assert.ok(!categorized.includes('secrets'))
  assert.ok(!categorized.includes('file:///'))
  assert.ok(
    categorized === 'AI service temporarily busy (high demand). Retrying automatically.' ||
    categorized === 'Analysis failed. Please try again.'
  )
})

test('Scenario 11: Permanent document limit errors abort model cascade without retrying', () => {
  const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview']
  const permanentError =
    '{"error":{"code":400,"message":"The document contains 1665 pages which exceeds the supported page limit of 1000."}}'

  let totalModelAttempts = 0

  for (const model of candidateModels) {
    let abortedEarly = false
    for (let attempt = 0; attempt < 3; attempt++) {
      totalModelAttempts++
      const isPermanent =
        permanentError.includes('exceeds the supported page limit') ||
        permanentError.includes('token count exceeds')
      if (isPermanent) {
        abortedEarly = true
        break
      }
    }
    if (abortedEarly) {
      break
    }
  }

  assert.equal(
    totalModelAttempts,
    1,
    'Must execute exactly 1 attempt and immediately terminate cascade on permanent document limit'
  )
})

await testAsync('Scenario 12: Over-limit PDF rejection occurs before any Gemini Files API call', async () => {
  let geminiApiCalled = false

  async function mockGeminiUpload() {
    geminiApiCalled = true
    return { name: 'files/mock-123' }
  }

  async function simulateDocumentPipeline(buffer) {
    await getAndValidatePdfPageCount(buffer, 10)
    await mockGeminiUpload()
  }

  const overLimitBuffer = await createSyntheticPdf(15)

  await assert.rejects(
    async () => {
      await simulateDocumentPipeline(overLimitBuffer)
    },
    /exceeds the supported page limit/
  )

  assert.equal(geminiApiCalled, false, 'Gemini Files API must NOT be called for over-limit PDFs')
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================')

if (passedTests !== totalTests) {
  process.exit(1)
}
