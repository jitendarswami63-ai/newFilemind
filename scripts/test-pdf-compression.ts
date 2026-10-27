import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { optimizePdfBuffer } from '../lib/storage/optimizer'
import assert from 'node:assert'

async function runPdfCompressionTests() {
  console.log('--- Testing PDF Compression & Integrity Verification ---')

  // 1. Create a synthetic PDF document with multiple pages
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < 5; i++) {
    const page = doc.addPage([600, 800])
    page.drawText(`Page ${i + 1}: FileMind Test Document for Structural Optimization`, {
      x: 50,
      y: 750,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    page.drawText('This is a structural test document designed to verify safe PDF compression.', {
      x: 50,
      y: 700,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  }
  const syntheticBuffer = Buffer.from(await doc.save())
  console.log(`[PASS] Synthetic test PDF generated (${syntheticBuffer.length} bytes)`)

  // Test 1: Run optimization on the synthetic PDF
  const optResult = await optimizePdfBuffer(syntheticBuffer)
  console.log(`Optimization result status: ${optResult.status}, reason: ${optResult.reason}`)
  assert.ok(
    optResult.status === 'optimized' || optResult.status === 'unchanged',
    'Status should be optimized or unchanged'
  )
  assert.ok(optResult.buffer instanceof Buffer, 'Returned buffer must be a Buffer')
  assert.strictEqual(optResult.originalSize, syntheticBuffer.length, 'Original size must match')

  // Test 2: Verify post-optimization integrity by reloading
  const reloaded = await PDFDocument.load(optResult.buffer)
  assert.strictEqual(reloaded.getPageCount(), 5, 'Page count must remain exactly 5')
  console.log('[PASS] Post-optimization integrity verification passed (5 pages preserved)')

  // Test 3: Digital Signature Skip Check
  const signedBuffer = Buffer.concat([
    syntheticBuffer,
    Buffer.from('\n% Simulated signature dictionary\n/ByteRange [0 100 200 300]\n/Type /Sig\n'),
  ])
  const signedResult = await optimizePdfBuffer(signedBuffer)
  assert.strictEqual(signedResult.status, 'skipped', 'Digitally signed PDF must be skipped')
  assert.ok(
    signedResult.reason?.includes('signature'),
    'Reason should mention signature structures'
  )
  assert.strictEqual(
    signedResult.buffer.length,
    signedBuffer.length,
    'Skipped buffer must equal input'
  )
  console.log('[PASS] Digital signature detection correctly skips optimization')

  // Test 4: Encryption Indicator Skip Check
  const encryptedBuffer = Buffer.concat([
    syntheticBuffer,
    Buffer.from('\n/Encrypt 12 0 R\n'),
  ])
  const encryptedResult = await optimizePdfBuffer(encryptedBuffer)
  assert.strictEqual(encryptedResult.status, 'skipped', 'Encrypted PDF must be skipped')
  assert.ok(encryptedResult.reason?.includes('encrypt'), 'Reason should mention encryption')
  console.log('[PASS] Encryption dictionary detection correctly skips optimization')

  // Test 5: Interactive JavaScript Indicator Skip Check
  const jsBuffer = Buffer.concat([
    syntheticBuffer,
    Buffer.from('\n/JavaScript << /Type /Action >>\n'),
  ])
  const jsResult = await optimizePdfBuffer(jsBuffer)
  assert.strictEqual(jsResult.status, 'skipped', 'PDF with interactive JS must be skipped')
  console.log('[PASS] Interactive script detection correctly skips optimization')

  // Test 6: Embedded Files Indicator Skip Check
  const efBuffer = Buffer.concat([
    syntheticBuffer,
    Buffer.from('\n/EmbeddedFiles << /Names [] >>\n'),
  ])
  const efResult = await optimizePdfBuffer(efBuffer)
  assert.strictEqual(efResult.status, 'skipped', 'PDF with embedded files must be skipped')
  console.log('[PASS] Embedded files detection correctly skips optimization')

  // Test 7: Non-PDF / Malformed Buffer Skip Check
  const malformedBuffer = Buffer.from('NOT A PDF FILE AT ALL')
  const malformedResult = await optimizePdfBuffer(malformedBuffer)
  assert.strictEqual(malformedResult.status, 'skipped', 'Malformed file must be skipped')
  assert.ok(
    malformedResult.reason?.includes('magic header'),
    'Reason should mention invalid header'
  )
  console.log('[PASS] Invalid header check correctly skips non-PDF data')

  console.log('\n>>> All PDF Compression & Safety Tests PASSED successfully! <<<\n')
}

runPdfCompressionTests().catch((err) => {
  console.error('PDF compression test failed:', err)
  process.exit(1)
})
