import 'server-only'
import {
  getAuthoritativeDocument,
  getDocumentPages,
  acquireIndexingLock,
  finalizeIndexing,
  markIndexingFailed,
  ChunkInsertPayload,
} from './service-role-worker'
import { chunkDocumentPages, validateChunksIntegrity } from './chunker'
import { embedChunksConcurrently, validateEmbeddingVector } from './embeddings'

/**
 * Main Phase 1B indexing worker.
 * Reads document_pages, creates deterministic chunks, generates 768-dim Gemini embeddings,
 * and atomically stores chunks with token-based lease fencing.
 */
export async function indexDocument(documentId: string): Promise<boolean> {
  // 1. Authoritative document lookup
  const doc = await getAuthoritativeDocument(documentId)
  if (!doc) {
    console.warn(`[DocumentIndex] docId=${documentId} stage=lookup attempt=0 status=not_found`)
    return false
  }

  // 2. Verify document has completed Phase 1A AI understanding
  if (doc.status !== 'completed') {
    console.warn(
      `[DocumentIndex] docId=${documentId} stage=precondition attempt=0 status=aborted reason=phase1a_not_completed current_status=${doc.status}`
    )
    return false
  }

  const authoritativeUserId = doc.user_id
  console.log(`[DocumentIndex] docId=${documentId} stage=lookup attempt=0 status=eligible`)

  // 3. Acquire atomic indexing lease & fencing token
  const token = await acquireIndexingLock(documentId, authoritativeUserId)
  if (!token) {
    console.log(`[DocumentIndex] docId=${documentId} stage=acquire attempt=0 status=lock_denied_or_active`)
    return false
  }

  console.log(`[DocumentIndex] docId=${documentId} stage=acquire attempt=1 status=acquired`)

  try {
    // 4. Read page texts from public.document_pages
    console.log(`[DocumentIndex] docId=${documentId} stage=read_pages attempt=1 status=started`)
    const pages = await getDocumentPages(documentId)

    if (!pages || pages.length === 0) {
      throw new Error('No extracted page text found for document')
    }

    console.log(`[DocumentIndex] docId=${documentId} stage=read_pages attempt=1 status=completed count=${pages.length}`)

    // 5. Deterministic page-aware chunking
    console.log(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=started`)
    const chunks = chunkDocumentPages(
      documentId,
      pages.map((p) => ({ page_number: p.page_number, text: p.extracted_text }))
    )

    validateChunksIntegrity(chunks)
    console.log(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=completed count=${chunks.length}`)

    // If document is completely empty of text, create at least one empty chunk or mark complete
    if (chunks.length === 0) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=empty_document`)
      await markIndexingFailed(documentId, authoritativeUserId, token, 'Document text content is empty')
      return false
    }

    // 6. Generate embeddings using Gemini Embedding 2 (768-dim) with bounded concurrency
    console.log(`[DocumentIndex] docId=${documentId} stage=embedding attempt=1 status=started`)
    const embeddingMap = await embedChunksConcurrently(
      chunks.map((c) => ({ chunk_index: c.chunk_index, content: c.content })),
      doc.filename
    )

    console.log(`[DocumentIndex] docId=${documentId} stage=embedding attempt=1 status=completed`)

    // 7. Assemble insert payload with verified vector arrays formatted for pgvector
    const insertPayload: ChunkInsertPayload[] = chunks.map((c) => {
      const vector = embeddingMap.get(c.chunk_index)
      if (!vector) {
        throw new Error(`Missing vector for chunk ${c.chunk_index}`)
      }
      validateEmbeddingVector(vector)

      return {
        page_start: c.page_start,
        page_end: c.page_end,
        chunk_index: c.chunk_index,
        content: c.content,
        content_hash: c.content_hash,
        embedding: JSON.stringify(vector), // pgvector accepts JSON array string e.g. "[0.1, 0.2, ...]"
      }
    })

    // 8. Atomic commit via finalize_document_indexing RPC (token fenced)
    console.log(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=started`)
    const committed = await finalizeIndexing(documentId, authoritativeUserId, token, insertPayload)

    if (!committed) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=stale_aborted`)
      return false
    }

    console.log(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=completed chunks=${insertPayload.length}`)
    return true
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during document indexing'
    console.error(`[DocumentIndex] docId=${documentId} stage=error attempt=1 status=failed detail:`, errorMsg)

    // Fenced failure transition
    const failedCommitted = await markIndexingFailed(documentId, authoritativeUserId, token, errorMsg.slice(0, 500))
    if (!failedCommitted) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=fail attempt=1 status=stale_aborted`)
    }

    return false
  }
}
