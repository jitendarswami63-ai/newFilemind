import { PDFDocument } from 'pdf-lib'

export type OptimizationStatus = 'optimized' | 'unchanged' | 'skipped' | 'failed'

export interface OptimizationResult {
  buffer: Buffer
  originalSize: number
  optimizedSize: number
  savedBytes: number
  savingsPercent: number
  wasOptimized: boolean
  status: OptimizationStatus
  reason?: string
}

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]
const MIN_SAVINGS_PERCENT_THRESHOLD = 1.0

function hasDigitalSignatureIndicators(buffer: Buffer): boolean {
  const str = buffer.toString('latin1')

  if (/\/ByteRange\s*\[/i.test(str)) {
    return true
  }
  if (/\/Type\s*\/Sig\b/i.test(str)) {
    return true
  }
  if (/\/SubFilter\s*\/(adbe\.pkcs7|ETSI\.CAdES|adbe\.x509)/i.test(str)) {
    return true
  }
  if (/\/DocTimeStamp\b/i.test(str)) {
    return true
  }

  return false
}

function hasXfaIndicators(buffer: Buffer): boolean {
  const str = buffer.toString('latin1')
  return /\/XFA\s*\[/i.test(str) || /\/XFA\s+\d+\s+\d+\s+R/i.test(str)
}

function hasInteractiveActions(buffer: Buffer): boolean {
  const str = buffer.toString('latin1')
  if (/\/JavaScript\s+/i.test(str) || /\/JS\s*\(/i.test(str) || /\/JS\s*</i.test(str)) {
    return true
  }
  if (/\/Launch\s+/i.test(str)) {
    return true
  }
  return false
}

function hasEmbeddedFiles(buffer: Buffer): boolean {
  const str = buffer.toString('latin1')
  if (/\/EmbeddedFiles\s+/i.test(str) || /\/EF\s+<<[^\>]*\/F\s+/i.test(str)) {
    return true
  }
  return false
}

function hasEncryptionDictionary(buffer: Buffer): boolean {
  const str = buffer.toString('latin1')
  return /\/Encrypt\s+\d+\s+\d+\s+R/i.test(str) || /\/Encrypt\s+<</i.test(str)
}

function isValidPdfHeader(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  return (
    buffer[0] === PDF_MAGIC_BYTES[0] &&
    buffer[1] === PDF_MAGIC_BYTES[1] &&
    buffer[2] === PDF_MAGIC_BYTES[2] &&
    buffer[3] === PDF_MAGIC_BYTES[3]
  )
}

export async function optimizePdfBuffer(originalBuffer: Buffer): Promise<OptimizationResult> {
  const originalSize = originalBuffer.length

  const unoptimizedResult = (status: OptimizationStatus, reason: string): OptimizationResult => ({
    buffer: originalBuffer,
    originalSize,
    optimizedSize: originalSize,
    savedBytes: 0,
    savingsPercent: 0,
    wasOptimized: false,
    status,
    reason,
  })

  if (!isValidPdfHeader(originalBuffer)) {
    return unoptimizedResult('skipped', 'Input is not a valid PDF (invalid magic header)')
  }

  if (hasEncryptionDictionary(originalBuffer)) {
    return unoptimizedResult('skipped', 'PDF is encrypted')
  }

  if (hasDigitalSignatureIndicators(originalBuffer)) {
    return unoptimizedResult('skipped', 'PDF appears digitally signed or contains signature structures')
  }

  if (hasXfaIndicators(originalBuffer)) {
    return unoptimizedResult('skipped', 'PDF contains XML Forms Architecture (XFA)')
  }

  if (hasInteractiveActions(originalBuffer)) {
    return unoptimizedResult('skipped', 'PDF contains interactive scripts or launch actions')
  }

  if (hasEmbeddedFiles(originalBuffer)) {
    return unoptimizedResult('skipped', 'PDF contains embedded file attachments')
  }

  let pdfDoc: PDFDocument
  let originalPageCount: number
  try {
    pdfDoc = await PDFDocument.load(originalBuffer, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
    })
    originalPageCount = pdfDoc.getPageCount()
    if (originalPageCount <= 0) {
      return unoptimizedResult('skipped', 'PDF contains zero pages')
    }
  } catch (loadErr: unknown) {
    const msg = loadErr instanceof Error ? loadErr.message : 'Unknown load error'
    if (msg.toLowerCase().includes('encrypt')) {
      return unoptimizedResult('skipped', 'PDF is encrypted')
    }
    return unoptimizedResult('skipped', `pdf-lib cannot safely parse the document: ${msg}`)
  }

  let optimizedBytes: Uint8Array
  try {
    optimizedBytes = await pdfDoc.save({
      useObjectStreams: true,
    })
  } catch (saveErr: unknown) {
    const msg = saveErr instanceof Error ? saveErr.message : 'Unknown serialization error'
    return unoptimizedResult('failed', `Reserialization failed: ${msg}`)
  }

  const optimizedBuffer = Buffer.from(optimizedBytes)
  const optimizedSize = optimizedBuffer.length

  if (!isValidPdfHeader(optimizedBuffer)) {
    return unoptimizedResult('failed', 'Optimized output has invalid PDF magic bytes')
  }

  let verifyDoc: PDFDocument
  try {
    verifyDoc = await PDFDocument.load(optimizedBuffer, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
    })
  } catch (verifyErr: unknown) {
    const msg = verifyErr instanceof Error ? verifyErr.message : 'Unknown verify error'
    return unoptimizedResult('failed', `Optimized output failed reload verification: ${msg}`)
  }

  if (verifyDoc.getPageCount() !== originalPageCount) {
    return unoptimizedResult(
      'failed',
      `Page count mismatch after optimization: original=${originalPageCount}, optimized=${verifyDoc.getPageCount()}`
    )
  }

  try {
    for (let i = 0; i < originalPageCount; i++) {
      const page = verifyDoc.getPage(i)
      if (!page) {
        return unoptimizedResult('failed', `Page ${i + 1} not accessible after optimization`)
      }
    }
  } catch (pageErr: unknown) {
    const msg = pageErr instanceof Error ? pageErr.message : 'Page access error'
    return unoptimizedResult('failed', `Page accessibility verification failed: ${msg}`)
  }

  if (optimizedSize >= originalSize) {
    return unoptimizedResult('unchanged', 'Optimized size is not smaller than original')
  }

  const savedBytes = originalSize - optimizedSize
  const savingsPercent = Number(((savedBytes / originalSize) * 100).toFixed(2))

  if (savingsPercent < MIN_SAVINGS_PERCENT_THRESHOLD) {
    return unoptimizedResult(
      'unchanged',
      `Savings of ${savingsPercent}% (${savedBytes} bytes) is below minimum threshold of ${MIN_SAVINGS_PERCENT_THRESHOLD}%`
    )
  }

  return {
    buffer: optimizedBuffer,
    originalSize,
    optimizedSize,
    savedBytes,
    savingsPercent,
    wasOptimized: true,
    status: 'optimized',
    reason: `Successfully optimized with object streams (${savingsPercent}% size reduction)`,
  }
}
