import { extractText } from 'unpdf'

export interface ExtractedPage {
  page_number: number
  text: string
}

export interface NativeExtractionResult {
  isDigital: boolean
  pages: ExtractedPage[]
  totalPages: number
  nonBlankPagesCount: number
  totalCharacters: number
  averageCharsPerPage: number
}

export async function extractNativePdfText(
  pdfBuffer: Buffer
): Promise<NativeExtractionResult> {
  try {
    const uint8 = new Uint8Array(
      pdfBuffer.buffer,
      pdfBuffer.byteOffset,
      pdfBuffer.byteLength
    )

    const rawResult = await extractText(uint8, { mergePages: false })
    const rawPages = Array.isArray(rawResult.text) ? rawResult.text : [rawResult.text || '']
    const totalPages = rawResult.totalPages || rawPages.length

    let totalCharacters = 0
    let nonBlankPagesCount = 0

    const pages: ExtractedPage[] = rawPages.map((pageText, index) => {
      const cleaned = (pageText || '').trim()
      const charCount = cleaned.length
      totalCharacters += charCount
      if (charCount >= 25) {
        nonBlankPagesCount++
      }
      return {
        page_number: index + 1,
        text: cleaned,
      }
    })

    const averageCharsPerPage = totalPages > 0 ? totalCharacters / totalPages : 0

    const isDigital =
      totalPages <= 5
        ? nonBlankPagesCount >= 1
        : nonBlankPagesCount / totalPages >= 0.2 || totalCharacters >= 500

    return {
      isDigital,
      pages,
      totalPages,
      nonBlankPagesCount,
      totalCharacters,
      averageCharsPerPage,
    }
  } catch (error: unknown) {
    console.warn(
      '[NativePDFExtractor] Native extraction failed, flagging for visual OCR fallback:',
      error instanceof Error ? error.message : String(error)
    )
    return {
      isDigital: false,
      pages: [],
      totalPages: 0,
      nonBlankPagesCount: 0,
      totalCharacters: 0,
      averageCharsPerPage: 0,
    }
  }
}

export function extractIntroductorySample(
  pages: ExtractedPage[],
  maxPages: number = 8,
  maxChars: number = 6000
): string {
  const introPages = pages.slice(0, maxPages)
  let combined = ''

  for (const page of introPages) {
    if (!page.text) continue
    const section = `--- Page ${page.page_number} ---\n${page.text}\n\n`
    if (combined.length + section.length > maxChars) {
      const remaining = maxChars - combined.length
      if (remaining > 100) {
        combined += section.substring(0, remaining) + '...'
      }
      break
    }
    combined += section
  }

  return combined.trim()
}
