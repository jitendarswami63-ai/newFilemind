import 'server-only'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'

export const EMBEDDING_MODEL = 'gemini-embedding-2'
export const EMBEDDING_DIMENSION = 768
export const CACHE_CAPACITY = 500
export const CACHE_TTL_MS = 60 * 60 * 1000 // 60 minutes
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000
const MAX_CONCURRENT_EMBEDDINGS = 5

let geminiClient: GoogleGenAI | null = null

interface CacheEntry {
  embedding: number[]
  createdAt: number
}

// In-memory Map preserving insertion/access order for LRU eviction
const queryEmbeddingCache = new Map<string, CacheEntry>()
// In-flight request collapsing map to prevent cache stampedes
const inFlightQueryRequests = new Map<string, Promise<number[]>>()

/**
 * Normalizes a query and generates a stable hashed cache key.
 */
export function generateQueryCacheKey(query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return crypto
    .createHash('sha256')
    .update(`${normalized}:${EMBEDDING_MODEL}:${EMBEDDING_DIMENSION}:v1`)
    .digest('hex')
}

/**
 * Retrieves a cached query embedding or null if missing/expired.
 */
export function getCachedQueryEmbedding(key: string): number[] | null {
  try {
    const entry = queryEmbeddingCache.get(key)
    if (!entry) return null

    // Check TTL expiry
    if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
      queryEmbeddingCache.delete(key)
      return null
    }

    // Refresh LRU order: delete and re-insert at end
    queryEmbeddingCache.delete(key)
    queryEmbeddingCache.set(key, entry)
    return entry.embedding
  } catch {
    return null
  }
}

/**
 * Stores an embedding in the cache, evicting the least-recently used entry if capacity exceeded.
 */
export function setCachedQueryEmbedding(key: string, embedding: number[]): void {
  try {
    // Validate vector integrity
    validateEmbeddingVector(embedding)

    // Evict least-recently used (first key in Map) if capacity reached
    if (queryEmbeddingCache.size >= CACHE_CAPACITY && !queryEmbeddingCache.has(key)) {
      const firstKey = queryEmbeddingCache.keys().next().value
      if (firstKey) {
        queryEmbeddingCache.delete(firstKey)
      }
    }

    // If key already exists, delete to re-insert at most recent position
    if (queryEmbeddingCache.has(key)) {
      queryEmbeddingCache.delete(key)
    }

    queryEmbeddingCache.set(key, {
      embedding,
      createdAt: Date.now(),
    })
  } catch {
    // Cache failures must never block search
  }
}

/**
 * Exports cache stats for diagnostics and testing.
 */
export function getQueryCacheStats(): { size: number; capacity: number; inFlightCount: number } {
  return {
    size: queryEmbeddingCache.size,
    capacity: CACHE_CAPACITY,
    inFlightCount: inFlightQueryRequests.size,
  }
}

/**
 * Clears the query embedding cache (for testing purposes).
 */
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

/**
 * Validates that an embedding vector is an array of exactly 768 finite numeric dimensions.
 */
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

/**
 * Sleep helper with exponential backoff and randomized jitter.
 */
function sleepWithJitter(attempt: number): Promise<void> {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 500
  const totalDelay = Math.min(exponentialDelay + jitter, 10000)
  return new Promise((resolve) => setTimeout(resolve, totalDelay))
}

/**
 * Checks whether an error is transient (429 Rate Limit, 503 Service Unavailable, timeout).
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('resource exhausted') ||
      msg.includes('503') ||
      msg.includes('unavailable') ||
      msg.includes('timeout') ||
      msg.includes('high demand') ||
      msg.includes('econnreset')
    )
  }
  return false
}

/**
 * Internal single-call execution with bounded exponential retry.
 */
async function callEmbedWithRetry(formattedText: string): Promise<number[]> {
  const client = getGeminiClient()
  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: [formattedText],
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      })

      // Extract values from response (supports both embeddings array and single embedding object)
      const values =
        response.embeddings?.[0]?.values ??
        (response as unknown as { embedding?: { values?: number[] } }).embedding?.values
      if (!values) {
        throw new Error('Gemini embedContent response did not return embedding values')
      }

      return validateEmbeddingVector(values)
    } catch (err: unknown) {
      lastError = err

      if (!isTransientError(err) || attempt === MAX_RETRIES - 1) {
        break
      }

      console.warn(
        `[Embedding] Transient failure on attempt ${attempt + 1}/${MAX_RETRIES}. Retrying... Detail:`,
        err instanceof Error ? err.message : err
      )
      await sleepWithJitter(attempt)
    }
  }

  throw new Error(
    `Failed to generate embedding after ${MAX_RETRIES} attempts: ${
      lastError instanceof Error ? lastError.message : 'Unknown error'
    }`
  )
}

/**
 * Formats and generates a 768-dimensional embedding for a document chunk.
 * Conceptual format: title: {title} | text: {chunk text}
 */
export async function embedDocumentChunk(
  chunkText: string,
  documentTitle?: string | null
): Promise<number[]> {
  const titleFormatted = documentTitle && documentTitle.trim().length > 0 ? documentTitle.trim() : 'none'
  const formattedInput = `title: ${titleFormatted} | text: ${chunkText.trim()}`
  return await callEmbedWithRetry(formattedInput)
}

/**
 * Formats and generates a 768-dimensional embedding for a user search query.
 * Conceptual format: task: search result | query: {user query}
 * Utilizes an in-memory LRU cache (500 capacity, 60m TTL) and in-flight request collapsing.
 */
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
  } catch {
    // Cache inspection error - fail open
  }

  // Check in-flight requests for identical query to prevent cache stampedes
  if (cacheKey && inFlightQueryRequests.has(cacheKey)) {
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

/**
 * Concurrency-controlled batch embedding of document chunks.
 * Limits simultaneous in-flight Gemini API requests to MAX_CONCURRENT_EMBEDDINGS.
 */
export async function embedChunksConcurrently(
  chunks: Array<{ chunk_index: number; content: string }>,
  documentTitle?: string | null
): Promise<Map<number, number[]>> {
  const results = new Map<number, number[]>()
  const queue = [...chunks]

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT_EMBEDDINGS, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break

      const vector = await embedDocumentChunk(item.content, documentTitle)
      results.set(item.chunk_index, vector)
    }
  })

  await Promise.all(workers)

  // Verify every chunk received a valid embedding
  for (const c of chunks) {
    if (!results.has(c.chunk_index)) {
      throw new Error(`Missing embedding for chunk index ${c.chunk_index}`)
    }
  }

  return results
}
