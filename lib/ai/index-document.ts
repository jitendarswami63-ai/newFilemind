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

export async function indexDocument(documentId: string): Promise<boolean> {

  const doc = await getAuthoritativeDocument(documentId)
  if (!doc) {
    console.warn(`[DocumentIndex] docId=${documentId} stage=lookup attempt=0 status=not_found`)
    return false
  }

  if (doc.status !== 'completed') {
    console.warn(
      `[DocumentIndex] docId=${documentId} stage=precondition attempt=0 status=aborted reason=phase1a_not_completed current_status=${doc.status}`
    )
    return false
  }

  const authoritativeUserId = doc.user_id
  console.log(`[DocumentIndex] docId=${documentId} stage=lookup attempt=0 status=eligible`)

  const token = await acquireIndexingLock(documentId, authoritativeUserId)
  if (!token) {
    console.log(`[DocumentIndex] docId=${documentId} stage=acquire attempt=0 status=lock_denied_or_active`)
    return false
  }

  console.log(`[DocumentIndex] docId=${documentId} stage=acquire attempt=1 status=acquired`)

  try {
    console.log(`[DocumentIndex] docId=${documentId} stage=read_pages attempt=1 status=started`)
    const pages = await getDocumentPages(documentId)

    if (!pages || pages.length === 0) {
      throw new Error('No extracted page text found for document')
    }

    console.log(`[DocumentIndex] docId=${documentId} stage=read_pages attempt=1 status=completed count=${pages.length}`)

    console.log(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=started`)
    const chunks = chunkDocumentPages(
      documentId,
      pages.map((p) => ({ page_number: p.page_number, text: p.extracted_text }))
    )

    validateChunksIntegrity(chunks)
    console.log(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=completed count=${chunks.length}`)

    if (chunks.length === 0) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=empty_document`)
      await markIndexingFailed(documentId, authoritativeUserId, token, 'Document text content is empty')
      return false
    }

    console.log(`[DocumentIndex] docId=${documentId} stage=embedding attempt=1 status=started`)
    const embeddingMap = await embedChunksConcurrently(
      chunks.map((c) => ({ chunk_index: c.chunk_index, content: c.content })),
      doc.filename
    )

    console.log(`[DocumentIndex] docId=${documentId} stage=embedding attempt=1 status=completed`)

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
        embedding: JSON.stringify(vector),
      }
    })

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

    const failedCommitted = await markIndexingFailed(documentId, authoritativeUserId, token, errorMsg.slice(0, 500))
    if (!failedCommitted) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=fail attempt=1 status=stale_aborted`)
    }

    return false
  }
}
