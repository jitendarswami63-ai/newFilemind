/**
 * Client-Side In-Memory Cache for Signed PDF URLs
 * 
 * Implements:
 * 1. Cache key identity: `${documentId}:${storagePath}` (detects storage version updates)
 * 2. 60-second expiration safety margin
 * 3. In-flight request collapsing (prevents duplicate simultaneous signed URL fetches)
 * 4. Strictly in-memory (no persistent localStorage/sessionStorage)
 */

interface CacheEntry {
  url: string
  expiresAt: number
  storagePath?: string
}

const signedUrlMemoryCache = new Map<string, CacheEntry>()
const inFlightSignedUrlRequests = new Map<string, Promise<string>>()

const SAFETY_MARGIN_MS = 60 * 1000 // 60 seconds safety margin

export function buildCacheKey(documentId: string, storagePath?: string): string {
  return storagePath ? `${documentId}:${storagePath}` : documentId
}

/**
 * Checks in-memory cache for a valid, non-expired signed URL.
 * Returns null if missing or within safety margin of expiration.
 */
export function getCachedSignedUrl(documentId: string, storagePath?: string): string | null {
  const key = buildCacheKey(documentId, storagePath)
  const entry = signedUrlMemoryCache.get(key)
  if (!entry) return null

  // Treat URL as expired BEFORE actual expiration (60-second safety margin)
  if (Date.now() >= entry.expiresAt - SAFETY_MARGIN_MS) {
    signedUrlMemoryCache.delete(key)
    return null
  }

  return entry.url
}

/**
 * Fetches signed URL with in-memory caching and in-flight request collapsing.
 */
export async function fetchSignedUrlWithCache(
  documentId: string,
  storagePath?: string
): Promise<string> {
  // 1. Check in-memory cache
  const cached = getCachedSignedUrl(documentId, storagePath)
  if (cached) {
    return cached
  }

  const key = buildCacheKey(documentId, storagePath)

  // 2. Check in-flight request collapsing
  if (inFlightSignedUrlRequests.has(key)) {
    return await inFlightSignedUrlRequests.get(key)!
  }

  // 3. Make fetch with in-flight collapsing
  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/download?type=viewer`)
      if (!res.ok) {
        throw new Error('Failed to generate viewer token')
      }
      const data = await res.json()
      const url = data.signedUrl as string
      const expiresAt = new Date(data.expiresAt).getTime()
      const returnedStoragePath = (data.storagePath as string) || storagePath

      // Store in memory cache under versioned key
      const finalKey = buildCacheKey(documentId, returnedStoragePath)
      const entry: CacheEntry = {
        url,
        expiresAt,
        storagePath: returnedStoragePath,
      }
      signedUrlMemoryCache.set(finalKey, entry)
      if (finalKey !== key) {
        signedUrlMemoryCache.set(key, entry)
      }

      return url
    } finally {
      inFlightSignedUrlRequests.delete(key)
    }
  })()

  inFlightSignedUrlRequests.set(key, fetchPromise)
  return await fetchPromise
}

/**
 * Debounced pre-fetch helper for document cards.
 * Silently warms up the in-memory cache without throwing or blocking UI.
 */
export async function prefetchSignedUrl(documentId: string, storagePath?: string): Promise<void> {
  try {
    const cached = getCachedSignedUrl(documentId, storagePath)
    if (!cached) {
      await fetchSignedUrlWithCache(documentId, storagePath)
    }
  } catch {
    // Prefetch failures must be silent
  }
}

/**
 * Diagnostics and test helpers.
 */
export function getSignedUrlCacheStats(): { size: number; inFlightCount: number } {
  return {
    size: signedUrlMemoryCache.size,
    inFlightCount: inFlightSignedUrlRequests.size,
  }
}

export function clearSignedUrlCache(): void {
  signedUrlMemoryCache.clear()
  inFlightSignedUrlRequests.clear()
}
