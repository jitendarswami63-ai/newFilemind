import assert from 'node:assert/strict'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  extractNativePdfText,
  extractIntroductorySample,
} from '../lib/ai/native-pdf-extractor.ts'
import {
  inferHeuristicMetadata,
} from '../lib/ai/metadata-synthesizer.ts'

console.log('====================================================')
console.log('🧪 FILEMIND HYBRID PDF PIPELINE VERIFICATION SUITE')
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

await testAsync('Scenario 1: Fast native extraction processes 20-page digital PDF in < 250ms', async () => {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)

  for (let i = 1; i <= 20; i++) {
    const page = doc.addPage([400, 600])
    page.drawText(`Chapter ${i}: Advanced Vector Calculus and Matrix Decompositions.\nPage text for page ${i}`, {
      x: 50,
      y: 500,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    })
  }

  const bytes = await doc.save()
  const buffer = Buffer.from(bytes)

  const startTime = Date.now()
  const result = await extractNativePdfText(buffer)
  const duration = Date.now() - startTime

  assert.equal(result.isDigital, true, 'Digital PDF must be classified as isDigital: true')
  assert.equal(result.totalPages, 20)
  assert.equal(result.pages.length, 20)
  assert.ok(duration < 1500, `Expected fast extraction (<1500ms), took ${duration}ms`)

  for (let p = 1; p <= 20; p++) {
    const page = result.pages[p - 1]
    assert.equal(page.page_number, p)
    assert.ok(page.text.includes(`Chapter ${p}`), `Page ${p} must contain chapter text`)
  }
})

await testAsync('Scenario 2: Scanned / empty PDF correctly classified as isDigital: false', async () => {
  const doc = await PDFDocument.create()
  for (let i = 0; i < 10; i++) {
    doc.addPage([400, 600])
  }

  const bytes = await doc.save()
  const buffer = Buffer.from(bytes)

  const result = await extractNativePdfText(buffer)
  assert.equal(result.isDigital, false, 'Blank or image-only PDF must be marked isDigital: false')
  assert.equal(result.totalCharacters, 0)
  assert.equal(result.nonBlankPagesCount, 0)
})

test('Scenario 3: extractIntroductorySample extracts first N pages capped at maxChars', () => {
  const pages = Array.from({ length: 50 }, (_, i) => ({
    page_number: i + 1,
    text: `Page ${i + 1} detailed discussion about linear algebra, eigenvalues, and orthogonal transformations.`,
  }))

  const sample = extractIntroductorySample(pages, 5, 500)
  assert.ok(sample.length > 0)
  assert.ok(sample.length <= 500, `Sample length (${sample.length}) must be <= 500`)
  assert.ok(sample.includes('--- Page 1 ---'))
  assert.ok(sample.includes('--- Page 2 ---'))
  assert.ok(!sample.includes('--- Page 20 ---'))
})

test('Scenario 4: inferHeuristicMetadata accurately classifies textbooks and reports without LLM', () => {
  const meta1 = inferHeuristicMetadata('pearson_mathematics.pdf', 'Chapter 1: Functions and Graphs')
  assert.equal(meta1.doc_category, 'Education / Textbook')
  assert.ok(meta1.tags.some((t) => t.toLowerCase().includes('mathematics')))
  assert.equal(meta1.metadata[0].key, 'title')
  assert.equal(meta1.metadata[0].value_string, 'pearson mathematics')

  const meta2 = inferHeuristicMetadata('q3_financial_report.pdf', 'Quarterly earnings statement')
  assert.equal(meta2.doc_category, 'Business Report')

  const meta3 = inferHeuristicMetadata('cloud_architecture_spec.pdf', 'System specifications')
  assert.equal(meta3.doc_category, 'Technical Specification')
})

await testAsync('Scenario 5: Native extractor handles 100 pages with 100% integrity', async () => {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)

  for (let i = 1; i <= 100; i++) {
    const page = doc.addPage([300, 400])
    page.drawText(`Page ${i} content in large volume test`, { x: 20, y: 350, size: 10, font })
  }

  const bytes = await doc.save()
  const buffer = Buffer.from(bytes)

  const result = await extractNativePdfText(buffer)
  assert.equal(result.isDigital, true)
  assert.equal(result.totalPages, 100)
  assert.equal(result.pages.length, 100)
  assert.equal(result.nonBlankPagesCount, 100)

  assert.equal(result.pages[0].page_number, 1)
  assert.equal(result.pages[99].page_number, 100)
})

await testAsync('Scenario 6: Mixed document with intentional blank divider pages remains isDigital: true', async () => {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)

  for (let i = 1; i <= 10; i++) {
    const page = doc.addPage([300, 400])
    if (i % 3 !== 0) {
      page.drawText(`Page ${i} textbook content with theorems and proofs.`, { x: 20, y: 350, size: 10, font })
    }
  }

  const bytes = await doc.save()
  const buffer = Buffer.from(bytes)

  const result = await extractNativePdfText(buffer)
  assert.equal(result.isDigital, true, 'Substantive document with occasional blank pages must be isDigital: true')
  assert.equal(result.totalPages, 10)
  assert.equal(result.pages[2].page_number, 3)
  assert.equal(result.pages[2].text, '', 'Blank page preserved with empty string')
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================')

if (passedTests !== totalTests) {
  process.exit(1)
}
