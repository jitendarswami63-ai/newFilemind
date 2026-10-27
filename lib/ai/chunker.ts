import { createHash } from 'crypto'

export interface PageText {
  page_number: number
  text: string
}

export interface DocumentChunk {
  document_id: string
  chunk_index: number
  page_start: number
  page_end: number
  content: string
  content_hash: string
}

// Target ~700-900 tokens (approx 3000-3600 characters)
const TARGET_CHUNK_CHARS = 3200
// Bounded overlap ~100-150 tokens (approx 450-600 characters)
const OVERLAP_CHARS = 500
// Minimum meaningful chunk size (avoids tiny tail fragments)
const MIN_CHUNK_CHARS = 100

/**
 * Deterministically chunks an ordered array of page texts from public.document_pages.
 * Preserves page_start, page_end, chunk_index, and sentence/paragraph boundaries.
 */
export function chunkDocumentPages(
  documentId: string,
  pages: PageText[]
): DocumentChunk[] {
  if (!pages || pages.length === 0) {
    return []
  }

  // Ensure pages are deterministically sorted by page_number
  const sortedPages = [...pages].sort((a, b) => a.page_number - b.page_number)

  // Build a segmented representation where each segment tracks its source page
  interface TextSegment {
    text: string
    page: number
  }

  const segments: TextSegment[] = []

  for (const page of sortedPages) {
    const rawText = page.text || ''
    // Split by paragraphs first
    const paragraphs = rawText.split(/\n\s*\n/)

    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (trimmed.length > 0) {
        segments.push({ text: trimmed, page: page.page_number })
      }
    }
  }

  // If document was completely empty or had only whitespace
  if (segments.length === 0) {
    return []
  }

  const rawChunks: Array<{
    content: string
    page_start: number
    page_end: number
  }> = []

  let currentBuffer: string[] = []
  let currentPages: number[] = []
  let currentLength = 0

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]

    // If adding this segment exceeds target and we already have sufficient content
    if (currentLength + seg.text.length > TARGET_CHUNK_CHARS && currentLength >= MIN_CHUNK_CHARS) {
      const chunkText = currentBuffer.join('\n\n').trim()
      if (chunkText.length > 0) {
        rawChunks.push({
          content: chunkText,
          page_start: Math.min(...currentPages),
          page_end: Math.max(...currentPages),
        })
      }

      // Compute overlap from the end of currentBuffer
      const overlapBuffer: string[] = []
      const overlapPages: number[] = []
      let overlapLen = 0

      for (let j = currentBuffer.length - 1; j >= 0; j--) {
        const item = currentBuffer[j]
        if (overlapLen + item.length <= OVERLAP_CHARS) {
          overlapBuffer.unshift(item)
          overlapPages.unshift(currentPages[j])
          overlapLen += item.length
        } else {
          break
        }
      }

      currentBuffer = [...overlapBuffer, seg.text]
      currentPages = [...overlapPages, seg.page]
      currentLength = currentBuffer.reduce((sum, item) => sum + item.length, 0)
    } else {
      currentBuffer.push(seg.text)
      currentPages.push(seg.page)
      currentLength += seg.text.length
    }
  }

  // Flush remaining buffer
  if (currentBuffer.length > 0) {
    const chunkText = currentBuffer.join('\n\n').trim()
    if (chunkText.length > 0) {
      // If the last chunk is too tiny and we have a previous chunk, merge it if bounded
      if (rawChunks.length > 0 && chunkText.length < MIN_CHUNK_CHARS) {
        const lastChunk = rawChunks[rawChunks.length - 1]
        if (lastChunk.content.length + chunkText.length < TARGET_CHUNK_CHARS * 1.5) {
          lastChunk.content = `${lastChunk.content}\n\n${chunkText}`
          lastChunk.page_end = Math.max(lastChunk.page_end, ...currentPages)
        } else {
          rawChunks.push({
            content: chunkText,
            page_start: Math.min(...currentPages),
            page_end: Math.max(...currentPages),
          })
        }
      } else {
        rawChunks.push({
          content: chunkText,
          page_start: Math.min(...currentPages),
          page_end: Math.max(...currentPages),
        })
      }
    }
  }

  // If no paragraphs could be formed (e.g. single long block), slice by boundary-aware sliding window
  if (rawChunks.length === 0 && segments.length > 0) {
    const combined = segments.map((s) => s.text).join('\n\n')
    const pageNum = segments[0].page
    rawChunks.push({
      content: combined.slice(0, TARGET_CHUNK_CHARS),
      page_start: pageNum,
      page_end: segments[segments.length - 1].page,
    })
  }

  // Convert rawChunks into deterministic DocumentChunk objects with content_hash and 0-indexed chunk_index
  return rawChunks.map((chunk, index) => {
    const hash = createHash('sha256')
      .update(`${documentId}:${index}:${chunk.page_start}:${chunk.page_end}:${chunk.content}`)
      .digest('hex')

    return {
      document_id: documentId,
      chunk_index: index,
      page_start: chunk.page_start,
      page_end: chunk.page_end,
      content: chunk.content,
      content_hash: hash,
    }
  })
}

/**
 * Validates chunk sequence integrity (ordering, non-emptiness, contiguous 0-indexing).
 */
export function validateChunksIntegrity(chunks: DocumentChunk[]): void {
  if (!Array.isArray(chunks)) {
    throw new Error('Chunks must be an array')
  }

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    if (c.chunk_index !== i) {
      throw new Error(`Non-contiguous chunk_index: expected ${i}, got ${c.chunk_index}`)
    }
    if (!c.content || c.content.trim().length === 0) {
      throw new Error(`Empty chunk content at index ${i}`)
    }
    if (c.page_start < 1 || c.page_end < c.page_start) {
      throw new Error(`Invalid page range at index ${i}: ${c.page_start} to ${c.page_end}`)
    }
    if (!c.content_hash || c.content_hash.length !== 64) {
      throw new Error(`Invalid content_hash at index ${i}`)
    }
  }
}
