import 'server-only'
import {
  getAuthoritativeDocument,
  getDocumentPages,
  acquireIndexingLock,
  getEmbeddedChunkCheckpoints,
  saveEmbeddedChunkWave,
  pauseIndexingForCooldown,
  completeCheckpointedIndexing,
  markIndexingFailed,
  getServiceRoleClient,
  ChunkInsertPayload,
} from './service-role-worker'
import { chunkDocumentPages, validateChunksIntegrity } from './chunker'
import {
  embedChunksConcurrently,
  validateEmbeddingVector,
  isPerMinuteTokenRateLimitError,
} from './embeddings'

const WAVE_TOKEN_BUDGET = 20_000
const MICRO_BATCH_CHUNKS = 5

function estimateChunkTokens(text: string): number {
  return Math.ceil((text?.length || 0) / 3.5) + 16
}

export async function indexDocument(documentId: string, apiKeyOverride?: string): Promise<boolean> {

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

  let completedCount = 0
  let totalChunksCount = 0

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
    totalChunksCount = chunks.length
    console.log(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=completed count=${chunks.length}`)

    if (chunks.length === 0) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=chunking attempt=1 status=empty_document`)
      await markIndexingFailed(documentId, authoritativeUserId, token, 'Document text content is empty')
      return false
    }

    const existingCheckpoints = await getEmbeddedChunkCheckpoints(documentId)
    const pendingChunks = chunks.filter((c) => {
      const checkpoint = existingCheckpoints.get(c.chunk_index)
      return !checkpoint || checkpoint.content_hash !== c.content_hash || !checkpoint.embedding
    })
    completedCount = chunks.length - pendingChunks.length

    if (pendingChunks.length === 0) {
      const finalized = await completeCheckpointedIndexing(documentId, authoritativeUserId, token, chunks.length)
      if (!finalized) {
        console.warn(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=stale_aborted`)
        return false
      }
      console.log(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=completed chunks=${chunks.length} (from checkpoints)`)
      return true
    }

    let effectiveApiKey = apiKeyOverride?.trim() || ''
    if (!effectiveApiKey) {
      try {
        const adminClient = getServiceRoleClient()
        const { data: ownerData } = await adminClient.auth.admin.getUserById(authoritativeUserId)
        const ownerByok = ownerData?.user?.user_metadata?.byok_gemini_key
        if (typeof ownerByok === 'string' && ownerByok.trim()) {
          effectiveApiKey = ownerByok.trim()
        }
      } catch {}
    }

    // Select a token-budgeted wave (<= 20k tokens) to stay safely within Gemini Free Tier's 30k TPM limit
    const waveChunks: typeof pendingChunks = []
    let waveTokens = 0
    for (const chunk of pendingChunks) {
      const chunkTokens = estimateChunkTokens(chunk.content)
      if (waveChunks.length > 0 && waveTokens + chunkTokens > WAVE_TOKEN_BUDGET) {
        break
      }
      waveChunks.push(chunk)
      waveTokens += chunkTokens
    }

    console.log(
      `[DocumentIndex] docId=${documentId} stage=embedding attempt=1 status=started completed=${completedCount}/${chunks.length} waveChunks=${waveChunks.length} estTokens=${waveTokens}`
    )

    for (let i = 0; i < waveChunks.length; i += MICRO_BATCH_CHUNKS) {
      const microBatch = waveChunks.slice(i, i + MICRO_BATCH_CHUNKS)
      const embeddingMap = await embedChunksConcurrently(
        microBatch.map((c) => ({ chunk_index: c.chunk_index, content: c.content })),
        doc.filename,
        effectiveApiKey || undefined
      )

      const microPayload: ChunkInsertPayload[] = microBatch.map((c) => {
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

      const waveSaved = await saveEmbeddedChunkWave(documentId, authoritativeUserId, token, microPayload)
      if (!waveSaved) {
        console.warn(`[DocumentIndex] docId=${documentId} stage=checkpoint status=stale_aborted`)
        return false
      }
      completedCount += microBatch.length
    }

    if (completedCount < chunks.length) {
      const cooldownMsg = `Partial vector index saved (${completedCount}/${chunks.length} chunks). Cooling down ~65s for Gemini 30k TPM limit before resuming.`
      await pauseIndexingForCooldown(documentId, authoritativeUserId, token, cooldownMsg)
      console.log(`[DocumentIndex] docId=${documentId} stage=cooldown_pause completed=${completedCount}/${chunks.length}`)
      return true
    }

    console.log(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=started`)
    const committed = await completeCheckpointedIndexing(documentId, authoritativeUserId, token, chunks.length)

    if (!committed) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=stale_aborted`)
      return false
    }

    console.log(`[DocumentIndex] docId=${documentId} stage=finalize attempt=1 status=completed chunks=${chunks.length}`)
    return true
  } catch (err: unknown) {
    if (isPerMinuteTokenRateLimitError(err)) {
      const cooldownMsg = `Paused for Gemini 1-minute token rate limit (${completedCount}/${totalChunksCount || '?'} chunks saved). Ready to resume after ~65s.`
      await pauseIndexingForCooldown(documentId, authoritativeUserId, token, cooldownMsg)
      console.warn(`[DocumentIndex] docId=${documentId} stage=rate_limit_pause completed=${completedCount}/${totalChunksCount}`)
      return false
    }

    const errorMsg = err instanceof Error ? err.message : 'Unknown error during document indexing'
    console.error(`[DocumentIndex] docId=${documentId} stage=error attempt=1 status=failed detail:`, errorMsg)

    const failedCommitted = await markIndexingFailed(documentId, authoritativeUserId, token, errorMsg.slice(0, 500))
    if (!failedCommitted) {
      console.warn(`[DocumentIndex] docId=${documentId} stage=fail attempt=1 status=stale_aborted`)
    }

    return false
  }
}
