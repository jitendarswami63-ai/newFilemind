// Mock server-only for standalone script execution
;(require.cache as Record<string, unknown>)[require.resolve('server-only')] = {
  exports: {},
  loaded: true,
  id: require.resolve('server-only'),
}

import assert from 'node:assert'
import {
  generateQueryCacheKey,
  getCachedQueryEmbedding,
  setCachedQueryEmbedding,
  getQueryCacheStats,
  clearQueryCache,
  CACHE_CAPACITY,
  EMBEDDING_DIMENSION,
} from '../lib/ai/embeddings'

async function runEmbeddingCacheTests() {
  console.log('--- Testing Search Query Embedding Cache ---')

  clearQueryCache()
  assert.strictEqual(getQueryCacheStats().size, 0, 'Cache should be empty initially')

  // Helper to generate a dummy 768-dim embedding vector
  const makeVector = (val: number): number[] => {
    const vec = new Array(EMBEDDING_DIMENSION).fill(0)
    vec[0] = val
    return vec
  }

  // 1. Test Query Normalization & Key Determinism
  console.log('[1/5] Testing query normalization and cache key hashing...')
  const key1 = generateQueryCacheKey('machine learning')
  const key2 = generateQueryCacheKey('   Machine   LEARNING  \n\t')
  const key3 = generateQueryCacheKey('deep learning')

  assert.strictEqual(key1, key2, 'Normalized queries with different casing/whitespace must produce identical keys')
  assert.notStrictEqual(key1, key3, 'Different queries must produce distinct keys')
  assert.strictEqual(key1.length, 64, 'Key must be a valid 64-char SHA-256 hex string')
  console.log('  -> Key generation verified: deterministic SHA-256 hash')

  // 2. Test Cache Set & Get (Hit / Miss)
  console.log('[2/5] Testing cache hit and miss semantics...')
  assert.strictEqual(getCachedQueryEmbedding(key1), null, 'Miss should return null')

  const sampleVec = makeVector(0.42)
  setCachedQueryEmbedding(key1, sampleVec)
  assert.strictEqual(getQueryCacheStats().size, 1, 'Cache size should be 1')

  const cached = getCachedQueryEmbedding(key1)
  assert.ok(cached !== null, 'Hit should return non-null vector')
  assert.strictEqual(cached?.length, EMBEDDING_DIMENSION, 'Cached vector dimension must be 768')
  assert.strictEqual(cached?.[0], 0.42, 'Cached values must match')
  console.log('  -> Cache hit/miss verified successfully')

  // 3. Test LRU Eviction & Capacity Constraint (500 entries)
  console.log(`[3/5] Testing LRU eviction up to capacity ${CACHE_CAPACITY}...`)
  clearQueryCache()

  // Fill up to CACHE_CAPACITY (500)
  for (let i = 0; i < CACHE_CAPACITY; i++) {
    const k = generateQueryCacheKey(`query_token_${i}`)
    setCachedQueryEmbedding(k, makeVector(i))
  }
  assert.strictEqual(getQueryCacheStats().size, CACHE_CAPACITY, `Cache size should reach ${CACHE_CAPACITY}`)

  // Access the very first key (`query_token_0`), refreshing its LRU position to MRU
  const key0 = generateQueryCacheKey('query_token_0')
  const key1Lru = generateQueryCacheKey('query_token_1')
  const fetched0 = getCachedQueryEmbedding(key0)
  assert.ok(fetched0 !== null, 'Key 0 should still be in cache')

  // Now insert a 501st entry - should evict key1Lru (which is now the LRU element, not key0)
  const keyOverflow = generateQueryCacheKey('query_overflow_item')
  setCachedQueryEmbedding(keyOverflow, makeVector(9999))

  assert.strictEqual(getQueryCacheStats().size, CACHE_CAPACITY, `Cache size must remain capped at ${CACHE_CAPACITY}`)
  assert.ok(getCachedQueryEmbedding(key0) !== null, 'Key 0 should be retained because it was refreshed')
  assert.strictEqual(getCachedQueryEmbedding(key1Lru), null, 'Key 1 (least recently used) must have been evicted')
  assert.ok(getCachedQueryEmbedding(keyOverflow) !== null, 'New overflow key must be present')
  console.log('  -> LRU ordering and capacity ceiling verified')

  // 4. Test Invalid Vector Protection
  console.log('[4/5] Testing vector integrity validation...')
  const invalidVecKey = generateQueryCacheKey('invalid_vec_test')
  // Vector with wrong dimension
  setCachedQueryEmbedding(invalidVecKey, [1, 2, 3])
  assert.strictEqual(getCachedQueryEmbedding(invalidVecKey), null, 'Vector with wrong dimension must be rejected')

  // Vector with NaN
  const nanVec = makeVector(0.5)
  nanVec[10] = NaN
  setCachedQueryEmbedding(invalidVecKey, nanVec)
  assert.strictEqual(getCachedQueryEmbedding(invalidVecKey), null, 'Vector with NaN must be rejected')
  console.log('  -> Vector integrity validation rejected malformed inputs safely')

  // 5. Cleanup
  clearQueryCache()
  assert.strictEqual(getQueryCacheStats().size, 0, 'Cache should be empty after clear')
  console.log('[5/5] Cache cleanup verified')

  console.log('\n>>> All Search Query Embedding Cache Tests PASSED! <<<\n')
}

runEmbeddingCacheTests().catch((err) => {
  console.error('Embedding cache test failed:', err)
  process.exit(1)
})
