import { PDFDocument } from 'pdf-lib'
import {
  DEFAULT_SEGMENT_PAGE_SIZE,
  MAX_SEGMENT_PAGES,
  MIN_SEGMENT_PAGES,
} from '../constants.ts'
import type { DocumentAiOutput, NormalizedMetadataItem } from './schema.ts'
import { validatePageIntegrity } from './schema.ts'

export interface SegmentRange {
  segmentIndex: number
  totalSegments: number
  pageStart: number
  pageEnd: number
  pageCount: number
}

export interface SegmentPlan {
  totalPages: number
  segmentSize: number
  totalSegments: number
  segments: SegmentRange[]
  requiresSplitting: boolean
}

export interface CompletenessValidationResult {
  isValid: boolean
  expectedCount: number
  receivedCount: number
  missingPages: number[]
  duplicatePages: number[]
  outOfRangePages: number[]
  errorMessage?: string
}

export class ExtractionIncompleteError extends Error {
  public readonly missingPages: number[]
  public readonly duplicatePages: number[]
  public readonly outOfRangePages: number[]

  constructor(
    message: string,
    diagnostics?: {
      missingPages?: number[]
      duplicatePages?: number[]
      outOfRangePages?: number[]
    }
  ) {
    super(message)
    this.name = 'ExtractionIncompleteError'
    this.missingPages = diagnostics?.missingPages || []
    this.duplicatePages = diagnostics?.duplicatePages || []
    this.outOfRangePages = diagnostics?.outOfRangePages || []
  }
}

export function validateSegmentExtractionCompleteness(
  extractedPages: Array<{ page_number: number; text: string }>,
  expectedCount: number
): CompletenessValidationResult {
  if (expectedCount <= 0) {
    return {
      isValid: false,
      expectedCount,
      receivedCount: extractedPages.length,
      missingPages: [],
      duplicatePages: [],
      outOfRangePages: [],
      errorMessage: `Expected count must be positive: ${expectedCount}`,
    }
  }

  const seenCounts = new Map<number, number>()
  const outOfRangePages: number[] = []

  for (const page of extractedPages) {
    const p = page.page_number
    if (typeof p !== 'number' || !Number.isInteger(p) || p < 1 || p > expectedCount) {
      outOfRangePages.push(p)
    } else {
      seenCounts.set(p, (seenCounts.get(p) || 0) + 1)
    }
  }

  const missingPages: number[] = []
  const duplicatePages: number[] = []

  for (let p = 1; p <= expectedCount; p++) {
    const count = seenCounts.get(p) || 0
    if (count === 0) {
      missingPages.push(p)
    } else if (count > 1) {
      duplicatePages.push(p)
    }
  }

  const isValid =
    missingPages.length === 0 &&
    duplicatePages.length === 0 &&
    outOfRangePages.length === 0 &&
    extractedPages.length === expectedCount

  let errorMessage: string | undefined
  if (!isValid) {
    const parts: string[] = []
    if (missingPages.length > 0) parts.push(`missing relative pages: [${missingPages.join(', ')}]`)
    if (duplicatePages.length > 0) parts.push(`duplicate relative pages: [${duplicatePages.join(', ')}]`)
    if (outOfRangePages.length > 0) parts.push(`out-of-range pages: [${outOfRangePages.join(', ')}]`)
    if (extractedPages.length !== expectedCount) {
      parts.push(`expected ${expectedCount} pages, received ${extractedPages.length}`)
    }
    errorMessage = `Segment extraction incomplete: ${parts.join('; ')}`
  }

  return {
    isValid,
    expectedCount,
    receivedCount: extractedPages.length,
    missingPages,
    duplicatePages,
    outOfRangePages,
    errorMessage,
  }
}

export function subdivideSegmentRange(
  range: SegmentRange
): [SegmentRange, SegmentRange] | null {
  if (range.pageCount <= 1) {
    return null
  }

  const mid = range.pageStart + Math.floor(range.pageCount / 2) - 1

  const sub1: SegmentRange = {
    segmentIndex: range.segmentIndex * 10 + 1,
    totalSegments: range.totalSegments,
    pageStart: range.pageStart,
    pageEnd: mid,
    pageCount: mid - range.pageStart + 1,
  }

  const sub2: SegmentRange = {
    segmentIndex: range.segmentIndex * 10 + 2,
    totalSegments: range.totalSegments,
    pageStart: mid + 1,
    pageEnd: range.pageEnd,
    pageCount: range.pageEnd - mid,
  }

  return [sub1, sub2]
}

export function calculateSegmentSize(totalPages: number, fileSizeBytes: number): number {
  if (totalPages <= 0) return DEFAULT_SEGMENT_PAGE_SIZE

  const bytesPerPage = fileSizeBytes / totalPages

  let segmentSize = DEFAULT_SEGMENT_PAGE_SIZE

  if (bytesPerPage > 200_000) {
    segmentSize = 25
  } else if (bytesPerPage > 100_000) {
    segmentSize = 40
  }

  if (totalPages <= segmentSize) {
    return totalPages
  }

  return Math.max(MIN_SEGMENT_PAGES, Math.min(segmentSize, MAX_SEGMENT_PAGES))
}

export function computeSegmentPlan(totalPages: number, fileSizeBytes: number): SegmentPlan {
  if (totalPages <= 0) {
    throw new Error(`Total pages must be positive. Received: ${totalPages}`)
  }

  const segmentSize = calculateSegmentSize(totalPages, fileSizeBytes)

  if (totalPages <= segmentSize) {
    return {
      totalPages,
      segmentSize,
      totalSegments: 1,
      segments: [
        {
          segmentIndex: 1,
          totalSegments: 1,
          pageStart: 1,
          pageEnd: totalPages,
          pageCount: totalPages,
        },
      ],
      requiresSplitting: false,
    }
  }

  const rawSegments: Array<Omit<SegmentRange, 'totalSegments'>> = []
  let currentPage = 1
  let index = 1

  while (currentPage <= totalPages) {
    const end = Math.min(currentPage + segmentSize - 1, totalPages)
    rawSegments.push({
      segmentIndex: index++,
      pageStart: currentPage,
      pageEnd: end,
      pageCount: end - currentPage + 1,
    })
    currentPage = end + 1
  }

  const totalSegments = rawSegments.length
  const segments: SegmentRange[] = rawSegments.map((s) => ({
    ...s,
    totalSegments,
  }))

  return {
    totalPages,
    segmentSize,
    totalSegments,
    segments,
    requiresSplitting: totalSegments > 1,
  }
}

export async function extractPdfSegment(
  source: Buffer | PDFDocument,
  pageStart: number,
  pageEnd: number
): Promise<Buffer> {
  if (pageStart < 1 || pageEnd < pageStart) {
    throw new Error(`Invalid page range: start=${pageStart}, end=${pageEnd}`)
  }

  const srcDoc =
    source instanceof PDFDocument
      ? source
      : await PDFDocument.load(source, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
        })

  const totalSrcPages = srcDoc.getPageCount()
  if (pageEnd > totalSrcPages) {
    throw new Error(
      `Requested end page ${pageEnd} exceeds source document page count ${totalSrcPages}`
    )
  }

  const subDoc = await PDFDocument.create()
  const pageIndices: number[] = []
  for (let p = pageStart; p <= pageEnd; p++) {
    pageIndices.push(p - 1)
  }

  const copiedPages = await subDoc.copyPages(srcDoc, pageIndices)
  for (const page of copiedPages) {
    subDoc.addPage(page)
  }

  const subPdfBytes = await subDoc.save({ useObjectStreams: true })
  return Buffer.from(subPdfBytes)
}

export function remapSegmentPagesToOriginal(
  extractedPages: Array<{ page_number: number; text: string }>,
  pageStart: number,
  pageEnd: number
): Array<{ page_number: number; text: string }> {
  const expectedSegmentCount = pageEnd - pageStart + 1
  const textByOriginalPage = new Map<number, string>()
  const hasPageRecord = new Set<number>()

  for (const page of extractedPages) {
    let originalPage = page.page_number

    if (originalPage >= 1 && originalPage <= expectedSegmentCount) {
      originalPage = pageStart + (originalPage - 1)
    } else if (originalPage < pageStart || originalPage > pageEnd) {
      continue
    }

    const existingText = textByOriginalPage.get(originalPage) || ''
    const newText = page.text ?? ''
    textByOriginalPage.set(
      originalPage,
      existingText ? `${existingText}\n${newText}` : newText
    )
    hasPageRecord.add(originalPage)
  }

  const missingPages: number[] = []
  const remappedPages: Array<{ page_number: number; text: string }> = []

  for (let p = pageStart; p <= pageEnd; p++) {
    if (!hasPageRecord.has(p)) {
      missingPages.push(p)
    } else {
      remappedPages.push({
        page_number: p,
        text: textByOriginalPage.get(p) ?? '',
      })
    }
  }

  if (missingPages.length > 0) {
    throw new ExtractionIncompleteError(
      `Extraction incomplete: missing pages [${missingPages.join(', ')}] in range ${pageStart}..${pageEnd}`,
      { missingPages }
    )
  }

  return remappedPages
}

export function mergeSegmentOutputs(
  segmentResults: Array<{
    output: DocumentAiOutput
    range: SegmentRange
  }>,
  totalPages: number
): DocumentAiOutput {
  if (segmentResults.length === 0) {
    throw new Error('Cannot merge empty segment results')
  }

  const firstSegment = segmentResults[0].output
  const docCategory = firstSegment.doc_category || 'Other'

  const tagSet = new Set<string>()
  const mergedTags: string[] = []
  for (const seg of segmentResults) {
    for (const tag of seg.output.tags || []) {
      const lower = tag.toLowerCase()
      if (!tagSet.has(lower)) {
        tagSet.add(lower)
        mergedTags.push(tag)
        if (mergedTags.length >= 20) break
      }
    }
    if (mergedTags.length >= 20) break
  }

  const metaKeysSeen = new Set<string>()
  const mergedMetadata: NormalizedMetadataItem[] = []
  for (const seg of segmentResults) {
    for (const item of seg.output.metadata || []) {
      const lowerKey = item.key.toLowerCase()
      if (!metaKeysSeen.has(lowerKey)) {
        metaKeysSeen.add(lowerKey)
        mergedMetadata.push(item)
        if (mergedMetadata.length >= 50) break
      }
    }
    if (mergedMetadata.length >= 50) break
  }

  const allPages: Array<{ page_number: number; text: string }> = []
  for (const seg of segmentResults) {
    allPages.push(...seg.output.pages)
  }

  allPages.sort((a, b) => a.page_number - b.page_number)
  const isScanned = segmentResults.some((s) => s.output.is_scanned)

  validatePageIntegrity(allPages, totalPages)

  return {
    doc_category: docCategory,
    tags: mergedTags,
    metadata: mergedMetadata,
    pages: allPages,
    page_count: totalPages,
    is_scanned: isScanned,
  }
}
