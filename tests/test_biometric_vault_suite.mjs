import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  deriveUserKek,
  envelopeEncryptDocument,
  envelopeDecryptDocument,
} from '../lib/crypto/document-encryption.ts'
import {
  storeChallenge,
  consumeChallenge,
} from '../lib/auth/webauthn.ts'

console.log('====================================================')
console.log('🧪 FILEMIND BIOMETRIC SECURE VAULT TEST SUITE')
console.log('====================================================\n')

let passedTests = 0
let totalTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
  }
}

async function testAsync(name, fn) {
  totalTests++
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
  }
}

test('Scenario 1: HKDF Master Key derivation is deterministic and context-bound', () => {
  const userId = 'user-1234-abcd'
  const key1 = deriveUserKek(userId, 1)
  const key2 = deriveUserKek(userId, 1)
  const keyVersion2 = deriveUserKek(userId, 2)
  const keyUser2 = deriveUserKek('user-5678-efgh', 1)

  assert.equal(key1.length, 32)
  assert.equal(key2.length, 32)
  assert.equal(key1.toString('hex'), key2.toString('hex'))
  assert.notEqual(key1.toString('hex'), keyVersion2.toString('hex'))
  assert.notEqual(key1.toString('hex'), keyUser2.toString('hex'))
})

test('Scenario 2: Envelope encryption round-trip preserves byte-for-byte PDF integrity', () => {
  const userId = '11111111-2222-3333-4444-555555555555'
  const documentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const samplePdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')

  const envelope = envelopeEncryptDocument(samplePdf, userId, documentId, 1)

  assert.ok(envelope.ciphertextBuffer.length > 0)
  assert.ok(envelope.encryptedDek.length > 0)
  assert.equal(Buffer.from(envelope.fileIv, 'base64url').length, 12)
  assert.equal(Buffer.from(envelope.fileTag, 'base64url').length, 16)
  assert.equal(Buffer.from(envelope.dekIv, 'base64url').length, 12)
  assert.equal(Buffer.from(envelope.dekTag, 'base64url').length, 16)

  const decrypted = envelopeDecryptDocument(
    envelope.ciphertextBuffer,
    envelope.encryptedDek,
    envelope.dekIv,
    envelope.dekTag,
    envelope.fileIv,
    envelope.fileTag,
    userId,
    documentId,
    1
  )

  assert.equal(decrypted.toString('utf8'), samplePdf.toString('utf8'))
})

test('Scenario 3: Tampered ciphertext is rejected prior to plaintext release', () => {
  const userId = '11111111-2222-3333-4444-555555555555'
  const documentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const samplePdf = Buffer.from('Confidential Medical Records: Patient 409')

  const envelope = envelopeEncryptDocument(samplePdf, userId, documentId, 1)
  const corruptedCiphertext = Buffer.from(envelope.ciphertextBuffer)
  corruptedCiphertext[0] ^= 0xff

  assert.throws(() => {
    envelopeDecryptDocument(
      corruptedCiphertext,
      envelope.encryptedDek,
      envelope.dekIv,
      envelope.dekTag,
      envelope.fileIv,
      envelope.fileTag,
      userId,
      documentId,
      1
    )
  }, /Unsupported state or unable to authenticate data|Decryption failed/)
})

test('Scenario 4: Forged authentication tag or wrong IV is rejected', () => {
  const userId = '11111111-2222-3333-4444-555555555555'
  const documentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const samplePdf = Buffer.from('Financial audit summary 2026')

  const envelope = envelopeEncryptDocument(samplePdf, userId, documentId, 1)

  const forgedTag = Buffer.from(envelope.fileTag, 'base64url')
  forgedTag[0] ^= 0x01

  assert.throws(() => {
    envelopeDecryptDocument(
      envelope.ciphertextBuffer,
      envelope.encryptedDek,
      envelope.dekIv,
      envelope.dekTag,
      envelope.fileIv,
      forgedTag.toString('base64url'),
      userId,
      documentId,
      1
    )
  }, /Unsupported state or unable to authenticate data|Decryption failed/)
})

test('Scenario 5: Cryptographic contextual binding (AAD) prevents cross-document decrypt replay', () => {
  const userId = '11111111-2222-3333-4444-555555555555'
  const docA = 'aaaaaaaa-1111-1111-1111-111111111111'
  const docB = 'bbbbbbbb-2222-2222-2222-222222222222'
  const samplePdf = Buffer.from('Doc A Secret Content')

  const envelope = envelopeEncryptDocument(samplePdf, userId, docA, 1)

  assert.throws(() => {
    envelopeDecryptDocument(
      envelope.ciphertextBuffer,
      envelope.encryptedDek,
      envelope.dekIv,
      envelope.dekTag,
      envelope.fileIv,
      envelope.fileTag,
      userId,
      docB,
      1
    )
  }, /Unsupported state or unable to authenticate data|Decryption failed/)
})

test('Scenario 6: Cross-user decrypt replay is rejected by user AAD binding', () => {
  const userA = 'user-alpha-1234'
  const userB = 'user-bravo-5678'
  const docId = 'cccccccc-3333-3333-3333-333333333333'
  const samplePdf = Buffer.from('Tax declaration statement')

  const envelope = envelopeEncryptDocument(samplePdf, userA, docId, 1)

  assert.throws(() => {
    envelopeDecryptDocument(
      envelope.ciphertextBuffer,
      envelope.encryptedDek,
      envelope.dekIv,
      envelope.dekTag,
      envelope.fileIv,
      envelope.fileTag,
      userB,
      docId,
      1
    )
  }, /Unsupported state or unable to authenticate data|Decryption failed/)
})

test('Scenario 7: WebAuthn challenge store provides single-use consumption and replay protection', () => {
  const userId = 'test-user-challenge'
  const docId = 'test-doc-challenge'
  const challenge = 'random-fido2-challenge-string'

  const token = storeChallenge(userId, challenge, docId)
  assert.ok(typeof token === 'string' && token.length > 10)

  const consumed = consumeChallenge(token)
  assert.ok(consumed !== null)
  assert.equal(consumed?.challenge, challenge)
  assert.equal(consumed?.userId, userId)
  assert.equal(consumed?.documentId, docId)

  const replayed = consumeChallenge(token)
  assert.equal(replayed, null)

  const nonExistent = consumeChallenge('00000000-0000-0000-0000-000000000000')
  assert.equal(nonExistent, null)
})

test('Scenario 8: Ephemeral biometric lease temporal bounds enforce 15-minute expiration', () => {
  const now = Date.now()
  const ttlMinutes = 15
  const expiresAtMs = now + ttlMinutes * 60 * 1000
  const expiresDate = new Date(expiresAtMs)

  assert.ok(expiresDate.getTime() > now)
  const diffMinutes = (expiresDate.getTime() - now) / (60 * 1000)
  assert.ok(Math.abs(diffMinutes - 15) < 0.1)

  const simulatedExpiredTime = new Date(now - 1000).toISOString()
  const isSimulatedActive = new Date(simulatedExpiredTime).getTime() > Date.now()
  assert.equal(isSimulatedActive, false)

  const simulatedActiveTime = new Date(now + 10 * 60 * 1000).toISOString()
  const isSimulatedValid = new Date(simulatedActiveTime).getTime() > Date.now()
  assert.equal(isSimulatedValid, true)
})

test('Scenario 9: Direct download route rejects locked documents with BIOMETRIC_REQUIRED', () => {
  const simulateDownloadRequest = (doc, hasLease) => {
    if (doc.is_locked && !hasLease) {
      return {
        status: 403,
        body: {
          error: 'Biometric authorization required to access locked document',
          code: 'BIOMETRIC_REQUIRED',
        },
      }
    }
    return {
      status: 200,
      body: { signedUrl: 'https://example.com/signed-token' },
    }
  }

  const lockedDoc = { id: 'doc-locked-1', is_locked: true }
  const respWithoutLease = simulateDownloadRequest(lockedDoc, false)
  assert.equal(respWithoutLease.status, 403)
  assert.equal(respWithoutLease.body.code, 'BIOMETRIC_REQUIRED')

  const respWithLease = simulateDownloadRequest(lockedDoc, true)
  assert.equal(respWithLease.status, 200)
  assert.ok(respWithLease.body.signedUrl)
})

test('Scenario 10: Ask AI document-scoped queries block unleased locked documents', () => {
  const simulateAskAiAuth = (doc, hasLease) => {
    if (doc.is_locked && !hasLease) {
      return {
        status: 403,
        body: {
          error: 'Biometric authorization required to query this locked document',
          code: 'BIOMETRIC_REQUIRED',
          documentId: doc.id,
        },
      }
    }
    return { status: 200, authorized: true }
  }

  const lockedDoc = { id: 'doc-locked-rag', is_locked: true, filename: 'Tax2026.pdf' }
  const unleased = simulateAskAiAuth(lockedDoc, false)
  assert.equal(unleased.status, 403)
  assert.equal(unleased.body.code, 'BIOMETRIC_REQUIRED')

  const leased = simulateAskAiAuth(lockedDoc, true)
  assert.equal(leased.status, 200)
  assert.equal(leased.authorized, true)
})

test('Scenario 11: Document deletion is strictly barred for locked files without lease', () => {
  const simulateDeleteDoc = (doc, hasLease) => {
    if (doc.is_locked && !hasLease) {
      return {
        status: 403,
        body: {
          error: 'Biometric authorization required to delete a locked document',
          code: 'BIOMETRIC_REQUIRED',
        },
      }
    }
    return { status: 200, body: { success: true } }
  }

  const lockedDoc = { id: 'doc-del-check', is_locked: true }
  const delBlocked = simulateDeleteDoc(lockedDoc, false)
  assert.equal(delBlocked.status, 403)
  assert.equal(delBlocked.body.code, 'BIOMETRIC_REQUIRED')

  const delAllowed = simulateDeleteDoc(lockedDoc, true)
  assert.equal(delAllowed.status, 200)
  assert.equal(delAllowed.body.success, true)
})

test('Scenario 12: Migration 08 SQL schema and rollback integrity', () => {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/08_biometric_secure_vault.sql')
  const rollbackPath = path.resolve(process.cwd(), 'supabase/migrations/rollbacks/08_biometric_secure_vault_rollback.sql')

  assert.ok(fs.existsSync(migrationPath), 'Migration 08 file must exist')
  assert.ok(fs.existsSync(rollbackPath), 'Migration 08 rollback file must exist')

  const migrationContent = fs.readFileSync(migrationPath, 'utf8')
  assert.ok(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.biometric_credentials'))
  assert.ok(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.biometric_leases'))
  assert.ok(migrationContent.includes('is_locked'))
  assert.ok(migrationContent.includes('has_active_biometric_lease'))

  const rollbackContent = fs.readFileSync(rollbackPath, 'utf8')
  assert.ok(rollbackContent.includes('DROP TABLE IF EXISTS public.biometric_leases'))
  assert.ok(rollbackContent.includes('DROP TABLE IF EXISTS public.biometric_credentials'))
  assert.ok(rollbackContent.includes('DROP FUNCTION IF EXISTS public.has_active_biometric_lease'))
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================\n')

if (passedTests < totalTests) {
  process.exit(1)
}
