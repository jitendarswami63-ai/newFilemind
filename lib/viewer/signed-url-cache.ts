interface CacheEntry {
  url: string
  expiresAt: number
  storagePath?: string
}

const signedUrlMemoryCache = new Map<string, CacheEntry>()
const inFlightSignedUrlRequests = new Map<string, Promise<string>>()

const SAFETY_MARGIN_MS = 60 * 1000

export function buildCacheKey(documentId: string, storagePath?: string): string {
  return storagePath ? `${documentId}:${storagePath}` : documentId
}

export function getCachedSignedUrl(documentId: string, storagePath?: string): string | null {
  const key = buildCacheKey(documentId, storagePath)
  const entry = signedUrlMemoryCache.get(key)
  if (!entry) return null

  if (Date.now() >= entry.expiresAt - SAFETY_MARGIN_MS) {
    signedUrlMemoryCache.delete(key)
    return null
  }

  return entry.url
}

export async function fetchSignedUrlWithCache(
  documentId: string,
  storagePath?: string
): Promise<string> {
  const cached = getCachedSignedUrl(documentId, storagePath)
  if (cached) {
    return cached
  }

  const key = buildCacheKey(documentId, storagePath)

  if (inFlightSignedUrlRequests.has(key)) {
    return await inFlightSignedUrlRequests.get(key)!
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/download?type=viewer`)
      if (!res.ok) {
        let errorMsg = 'Failed to generate viewer token'
        try {
          const errData = await res.json()
          if (errData.error) errorMsg = errData.error
        } catch {}
        throw new Error(errorMsg)
      }
      const data = await res.json()
      const url = data.signedUrl as string
      const expiresAt = new Date(data.expiresAt).getTime()
      const returnedStoragePath = (data.storagePath as string) || storagePath

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

export async function prefetchSignedUrl(documentId: string, storagePath?: string): Promise<void> {
  try {
    const cached = getCachedSignedUrl(documentId, storagePath)
    if (!cached) {
      await fetchSignedUrlWithCache(documentId, storagePath)
    }
  } catch {} }

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
