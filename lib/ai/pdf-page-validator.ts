import { PDFDocument } from 'pdf-lib'
import { MAX_DOCUMENT_PAGES, MAX_TOTAL_DOCUMENT_PAGES } from '../constants.ts'

export { MAX_DOCUMENT_PAGES, MAX_TOTAL_DOCUMENT_PAGES }

export async function getAndValidatePdfPageCount(
  buffer: Buffer,
  maxPages: number = MAX_DOCUMENT_PAGES
): Promise<number> {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty or missing.')
  }

  let pdfDoc: PDFDocument
  try {
    pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('encrypt')) {
      throw new Error('PDF is password-protected or encrypted.')
    }
    throw new Error(`Failed to determine PDF page count: ${msg}`)
  }

  let pageCount: number
  try {
    pageCount = pdfDoc.getPageCount()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to determine PDF page count: ${msg}`)
  }

  if (typeof pageCount !== 'number' || Number.isNaN(pageCount) || pageCount <= 0) {
    throw new Error('PDF contains zero pages or invalid page tree.')
  }

  if (pageCount > maxPages) {
    throw new Error(
      `The document contains ${pageCount} pages which exceeds the supported page limit of ${maxPages}.`
    )
  }

  return pageCount
}

export function categorizeDocumentError(
  errorMsg: string,
  maxPages: number = MAX_DOCUMENT_PAGES
): string {
  if (!errorMsg) return 'Analysis failed. Please try again.'
  const msgLower = errorMsg.toLowerCase()

  if (
    msgLower.includes('exceeds the supported page limit') ||
    msgLower.includes('page limit') ||
    (msgLower.includes('pages') && msgLower.includes('exceed'))
  ) {
    const pageMatch = errorMsg.match(/contains\s+(\d+)\s+pages/i)
    if (pageMatch) {
      return `Document exceeds page limit (${pageMatch[1]} pages; maximum is ${maxPages}).`
    }
    return `Document exceeds the maximum limit of ${maxPages} pages for AI analysis.`
  }

  if (
    msgLower.includes('token count exceeds') ||
    msgLower.includes('tokens allowed') ||
    msgLower.includes('context length')
  ) {
    return 'Document text exceeds maximum AI model context limit (1,048,576 tokens).'
  }

  if (msgLower.includes('encrypted') || msgLower.includes('password')) {
    return 'PDF is password-protected or encrypted.'
  }

  if (
    msgLower.includes('cannot safely parse') ||
    msgLower.includes('failed to determine pdf page count') ||
    msgLower.includes('corrupt')
  ) {
    return 'Could not safely read PDF pages. The file may be corrupt or malformed.'
  }

  if (msgLower.includes('storage') || msgLower.includes('download')) {
    return 'Failed to retrieve document from storage.'
  }

  if (
    msgLower.includes('files api') ||
    msgLower.includes('gemini') ||
    msgLower.includes('503') ||
    msgLower.includes('429') ||
    msgLower.includes('high demand') ||
    msgLower.includes('unavailable') ||
    msgLower.includes('resource_exhausted') ||
    msgLower.includes('rate limit')
  ) {
    return 'AI service temporarily busy (high demand). Retrying automatically.'
  }

  if (
    msgLower.includes('json') ||
    msgLower.includes('validate') ||
    msgLower.includes('integrity') ||
    msgLower.includes('schema')
  ) {
    return 'Could not parse structured content from document.'
  }

  if (msgLower.includes('timeout') || msgLower.includes('timed out')) {
    return 'AI analysis timed out. Click to retry.'
  }

  return 'Analysis failed. Please try again.'
}
