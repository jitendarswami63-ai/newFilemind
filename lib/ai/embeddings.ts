import 'server-only'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'
import { EMBEDDING_BATCH_SIZE } from '../constants.ts'

export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2'
export const FALLBACK_EMBEDDING_MODELS = [EMBEDDING_MODEL]
export const EMBEDDING_DIMENSION = 768
export const CACHE_CAPACITY = 500
export const CACHE_TTL_MS = 60 * 60 * 1000
const BASE_DELAY_MS = 1000
const MAX_CONCURRENT_EMBEDDINGS = 5

let geminiClient: GoogleGenAI | null = null

interface CacheEntry {
  embedding: number[]
  createdAt: number
}

const queryEmbeddingCache = new Map<string, CacheEntry>()

const inFlightQueryRequests = new Map<string, Promise<number[]>>()

export function generateQueryCacheKey(query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return crypto
    .createHash('sha256')
    .update(`${normalized}:${EMBEDDING_MODEL}:${EMBEDDING_DIMENSION}:v1`)
    .digest('hex')
}

export function getCachedQueryEmbedding(key: string): number[] | null {
  try {
    const entry = queryEmbeddingCache.get(key)
    if (!entry) return null

    if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
      queryEmbeddingCache.delete(key)
      return null
    }

    queryEmbeddingCache.delete(key)
    queryEmbeddingCache.set(key, entry)
    return entry.embedding
  } catch {
    return null
  }
}

export function setCachedQueryEmbedding(key: string, embedding: number[]): void {
  try {
    validateEmbeddingVector(embedding)

    if (queryEmbeddingCache.size >= CACHE_CAPACITY && !queryEmbeddingCache.has(key)) {
      const firstKey = queryEmbeddingCache.keys().next().value
      if (firstKey) {
        queryEmbeddingCache.delete(firstKey)
      }
    }

    if (queryEmbeddingCache.has(key)) {
      queryEmbeddingCache.delete(key)
    }

    queryEmbeddingCache.set(key, {
      embedding,
      createdAt: Date.now(),
    })
  } catch {} }

export function getQueryCacheStats(): { size: number; capacity: number; inFlightCount: number } {
  return {
    size: queryEmbeddingCache.size,
    capacity: CACHE_CAPACITY,
    inFlightCount: inFlightQueryRequests.size,
  }
}

export function clearQueryCache(): void {
  queryEmbeddingCache.clear()
  inFlightQueryRequests.clear()
}

function getGeminiClient(): GoogleGenAI {
  if (geminiClient) {
    return geminiClient
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server')
  }

  geminiClient = new GoogleGenAI({ apiKey })
  return geminiClient
}

export function validateEmbeddingVector(vector: unknown): number[] {
  if (!Array.isArray(vector)) {
    throw new Error('Embedding vector must be an array')
  }

  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${vector.length}`
    )
  }

  for (let i = 0; i < vector.length; i++) {
    const val = vector[i]
    if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
      throw new Error(`Embedding element at index ${i} is not a valid finite number: ${val}`)
    }
  }

  return vector as number[]
}

function extractRetryDelayMs(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (Array.isArray(errObj.details)) {
      for (const d of errObj.details) {
        if (typeof (d as Record<string, unknown>)?.retryDelay === 'string') {
          const seconds = parseFloat(((d as Record<string, unknown>).retryDelay as string).replace('s', ''))
          if (!isNaN(seconds)) return Math.ceil(seconds * 1000)
        }
      }
    }
    const msg = String(errObj.message || '')
    const match = msg.match(/retry in\s+([\d.]+)\s*s/i)
    if (match && match[1]) {
      const seconds = parseFloat(match[1])
      if (!isNaN(seconds)) return Math.ceil(seconds * 1000)
    }
  }
  return null
}

function sleepWithJitter(attempt: number, error?: unknown): Promise<void> {
  const serverDelayMs = extractRetryDelayMs(error)
  if (serverDelayMs !== null) {
    const safeDelay = Math.min(serverDelayMs + 1000, 65000)
    console.log(`[Embedding] Quota rate limit detected. Pacing worker for ${Math.round(safeDelay / 1000)}s...`)
    return new Promise((resolve) => setTimeout(resolve, safeDelay))
  }

  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 500
  const totalDelay = Math.min(exponentialDelay + jitter, 15000)
  return new Promise((resolve) => setTimeout(resolve, totalDelay))
}

export function isQuotaExhaustedError(err: unknown): boolean {
  if (!err) return false
  const msg = String(err instanceof Error ? err.message : err).toLowerCase()
  return (
    msg.includes('exceeded your current quota') ||
    msg.includes('per day limit') ||
    msg.includes('embed_content_free_tier_requests') ||
    msg.includes('generate_content_free_tier_requests') ||
    msg.includes('daily limit') ||
    msg.includes('resource_exhausted')
  )
}

function isTransientError(error: unknown): boolean {
  if (isQuotaExhaustedError(error)) {
    return false
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('503') ||
      msg.includes('unavailable') ||
      msg.includes('timeout') ||
      msg.includes('high demand') ||
      msg.includes('econnreset')
    )
  }
  return false
}

async function callEmbedWithRetry(formattedText: string): Promise<number[]> {
  const client = getGeminiClient()
  let lastError: unknown = null

  for (const modelName of FALLBACK_EMBEDDING_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.embedContent({
          model: modelName,
          contents: [formattedText],
          config: {
            outputDimensionality: EMBEDDING_DIMENSION,
          },
        })

        const values =
          response.embeddings?.[0]?.values ??
          (response as unknown as { embedding?: { values?: number[] } }).embedding?.values
        if (!values) {
          throw new Error(`Gemini ${modelName} embedContent response did not return embedding values`)
        }

        return validateEmbeddingVector(values)
      } catch (err: unknown) {
        lastError = err

        if (isQuotaExhaustedError(err)) {
          console.warn(`[Embedding] Model ${modelName} daily quota exhausted. Bypassing semantic search to prevent vector space pollution and allowing instant lexical failover.`)
          throw err
        }

        if (!isTransientError(err) || attempt === 1) {
          break
        }

        console.warn(
          `[Embedding] Transient failure on ${modelName} attempt ${attempt + 1}. Retrying... Detail:`,
          err instanceof Error ? err.message : err
        )
        await sleepWithJitter(attempt, err)
      }
    }
  }

  throw new Error(
    `Failed to generate embedding across all models: ${
      lastError instanceof Error ? lastError.message : 'Unknown error'
    }`
  )
}

export async function embedDocumentChunk(
  chunkText: string,
  documentTitle?: string | null
): Promise<number[]> {
  const titleFormatted = documentTitle && documentTitle.trim().length > 0 ? documentTitle.trim() : 'none'
  const formattedInput = `title: ${titleFormatted} | text: ${chunkText.trim()}`
  return await callEmbedWithRetry(formattedInput)
}

export async function embedSearchQuery(queryText: string): Promise<number[]> {
  const cleanQuery = queryText.trim()
  if (!cleanQuery) {
    throw new Error('Search query text cannot be empty')
  }

  let cacheKey: string | null = null
  try {
    cacheKey = generateQueryCacheKey(cleanQuery)
    const cached = getCachedQueryEmbedding(cacheKey)
    if (cached) {
      return cached
    }
  } catch {} if (cacheKey && inFlightQueryRequests.has(cacheKey)) {
    return await inFlightQueryRequests.get(cacheKey)!
  }

  const formattedQuery = `task: search result | query: ${cleanQuery}`

  const embeddingPromise = (async () => {
    try {
      const vector = await callEmbedWithRetry(formattedQuery)
      if (cacheKey) {
        setCachedQueryEmbedding(cacheKey, vector)
      }
      return vector
    } finally {
      if (cacheKey) {
        inFlightQueryRequests.delete(cacheKey)
      }
    }
  })()

  if (cacheKey) {
    inFlightQueryRequests.set(cacheKey, embeddingPromise)
  }

  return await embeddingPromise
}

async function callEmbedBatchWithRetry(formattedTexts: string[]): Promise<number[][]> {
  if (formattedTexts.length === 0) return []
  if (formattedTexts.length === 1) {
    const single = await callEmbedWithRetry(formattedTexts[0])
    return [single]
  }

  const client = getGeminiClient()
  let lastError: unknown = null

  for (const modelName of FALLBACK_EMBEDDING_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.embedContent({
          model: modelName,
          contents: formattedTexts,
          config: {
            outputDimensionality: EMBEDDING_DIMENSION,
          },
        })

        const embeddingsList = response.embeddings
        if (!Array.isArray(embeddingsList) || embeddingsList.length !== formattedTexts.length) {
          throw new Error(
            `Batch embedContent (${modelName}) returned unexpected count: expected ${formattedTexts.length}, got ${embeddingsList?.length ?? 0}`
          )
        }

        const validatedVectors: number[][] = []
        for (let i = 0; i < embeddingsList.length; i++) {
          const vals = embeddingsList[i]?.values
          if (!vals) {
            throw new Error(`Missing embedding values for batch item at index ${i}`)
          }
          validatedVectors.push(validateEmbeddingVector(vals))
        }

        return validatedVectors
      } catch (err: unknown) {
        lastError = err

        if (isQuotaExhaustedError(err)) {
          console.warn(`[Embedding] Batch model ${modelName} quota exhausted. Aborting batch embedding immediately.`)
          throw err
        }

        if (!isTransientError(err) || attempt === 1) {
          break
        }

        console.warn(
          `[Embedding] Transient failure on batch embed (${modelName}) attempt ${attempt + 1}. Retrying... Detail:`,
          err instanceof Error ? err.message : err
        )
        await sleepWithJitter(attempt, err)
      }
    }
  }

  throw new Error(
    `Failed to generate batch embedding across models: ${
      lastError instanceof Error ? lastError.message : 'Unknown error'
    }`
  )
}

export async function embedChunksConcurrently(
  chunks: Array<{ chunk_index: number; content: string }>,
  documentTitle?: string | null
): Promise<Map<number, number[]>> {
  const results = new Map<number, number[]>()
  if (chunks.length === 0) return results

  const titleFormatted = documentTitle && documentTitle.trim().length > 0 ? documentTitle.trim() : 'none'

  const batches: Array<Array<{ chunk_index: number; content: string }>> = []
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    batches.push(chunks.slice(i, i + EMBEDDING_BATCH_SIZE))
  }

  const batchQueue = [...batches]

  const concurrencyLimit = batchQueue.length > 8 ? 2 : Math.min(MAX_CONCURRENT_EMBEDDINGS, batchQueue.length)
  const workers = Array.from(
    { length: concurrencyLimit },
    async () => {
      while (batchQueue.length > 0) {
        const batch = batchQueue.shift()
        if (!batch) break

        const formattedInputs = batch.map((item) => `title: ${titleFormatted} | text: ${item.content.trim()}`)

        try {
          const vectors = await callEmbedBatchWithRetry(formattedInputs)
          for (let i = 0; i < batch.length; i++) {
            results.set(batch[i].chunk_index, vectors[i])
          }

          if (batchQueue.length > 0) {
            const pacingDelay = batchQueue.length > 8 ? 600 : 150
            await new Promise((r) => setTimeout(r, pacingDelay))
          }
        } catch (batchErr: unknown) {
          console.warn(
            `[Embedding] Batch embedding of ${batch.length} chunks encountered error, falling back to sequential item embedding:`,
            batchErr instanceof Error ? batchErr.message : batchErr
          )
          for (const item of batch) {
            const singleVector = await embedDocumentChunk(item.content, documentTitle)
            results.set(item.chunk_index, singleVector)
          }
        }
      }
    }
  )

  await Promise.all(workers)

  for (const c of chunks) {
    if (!results.has(c.chunk_index)) {
      throw new Error(`Missing embedding for chunk index ${c.chunk_index}`)
    }
  }

  return results
}
