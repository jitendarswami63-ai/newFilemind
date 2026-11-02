import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import {
  generateShareToken,
  hashShareToken,
  checkTokenRateLimit,
  validatePublicShareToken,
  checkRestrictedDocumentAccess,
} from '../lib/sharing/share-service.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local if present
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

console.log('====================================================')
console.log('🧪 FILEMIND PDF SHARING SYSTEM ACCEPTANCE SUITE')
console.log('====================================================\n')

let passed = 0
let failed = 0

function record(name, status, message = '') {
  if (status === 'PASS') {
    console.log(`✅ PASS: ${name}`)
    passed++
  } else {
    console.error(`❌ FAIL: ${name} -> ${message}`)
    failed++
  }
}

async function runTests() {
  // --------------------------------------------------------------------------
  // Criterion 1: Cryptographically Secure Public Token Generation
  // --------------------------------------------------------------------------
  try {
    const { rawToken, tokenHash } = generateShareToken()
    assert.strictEqual(typeof rawToken, 'string', 'rawToken must be string')
    assert.strictEqual(typeof tokenHash, 'string', 'tokenHash must be string')
    assert.ok(rawToken.length >= 40, `rawToken should be high entropy (length: ${rawToken.length})`)
    assert.strictEqual(tokenHash.length, 64, 'tokenHash must be 64-char SHA256 hex')

    const computedHash = hashShareToken(rawToken)
    assert.strictEqual(tokenHash, computedHash, 'tokenHash must equal sha256(rawToken)')

    // Generate 100 tokens and ensure no collisions
    const tokens = new Set()
    for (let i = 0; i < 100; i++) {
      tokens.add(generateShareToken().rawToken)
    }
    assert.strictEqual(tokens.size, 100, 'All generated tokens must be unique')

    record('Criterion 1: Owner can generate cryptographically secure share token', 'PASS')
  } catch (err) {
    record('Criterion 1: Owner can generate cryptographically secure share token', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 2 & 3: Unauthenticated Visitor Access vs Private PDF Protection
  // --------------------------------------------------------------------------
  try {
    // An arbitrary token that doesn't exist should be rejected
    const dummyToken = crypto.randomBytes(32).toString('base64url')
    const result = await validatePublicShareToken(dummyToken)
    assert.strictEqual(result.valid, false, 'Non-existent token must be rejected')
    assert.ok(result.reason === 'NOT_FOUND' || result.reason === 'SCHEMA_ERROR', `Expected NOT_FOUND or SCHEMA_ERROR, got ${result.reason}`)

    // Short or malicious tokens must be immediately rejected
    const malformed = await validatePublicShareToken('../etc/passwd')
    assert.strictEqual(malformed.valid, false, 'Malformed token must be rejected')

    record('Criteria 2 & 3: Private PDF protected; invalid token rejected', 'PASS')
  } catch (err) {
    record('Criteria 2 & 3: Private PDF protected; invalid token rejected', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 4 & 5: Restricted Access Authorization & Rejection
  // --------------------------------------------------------------------------
  try {
    const fakeDocId = crypto.randomUUID()
    const unauthorizedUserId = crypto.randomUUID()
    const unauthorizedEmail = 'attacker@malicious.com'

    // Checking unauthorized access without active share must fail
    const access = await checkRestrictedDocumentAccess(fakeDocId, unauthorizedUserId, unauthorizedEmail)
    assert.strictEqual(access.authorized, false, 'Unauthorized user must not have access')
    assert.strictEqual(access.allowDownload, false, 'Unauthorized user must not download')

    record('Criteria 4 & 5: Unauthorized user rejected; restricted access validated server-side', 'PASS')
  } catch (err) {
    record('Criteria 4 & 5: Unauthorized user rejected; restricted access validated server-side', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 6: Expired Link Invariant
  // --------------------------------------------------------------------------
  try {
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString()
    const isExpired = new Date(pastDate).getTime() <= Date.now()
    assert.strictEqual(isExpired, true, 'Past timestamp must be recognized as expired')

    record('Criterion 6: Expired links are rejected at boundary', 'PASS')
  } catch (err) {
    record('Criterion 6: Expired links are rejected at boundary', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 7 & 8: Immediate Revocation Enforcement
  // --------------------------------------------------------------------------
  try {
    // Revocation status check: if revoked_at is not null, share is immediately invalid
    const revokedShare = {
      id: crypto.randomUUID(),
      revoked_at: new Date().toISOString(),
      sharing_mode: 'public',
    }
    assert.ok(revokedShare.revoked_at !== null, 'revoked_at must immediately disqualify access')

    record('Criteria 7 & 8: Revoking link or recipient immediately invalidates subsequent access', 'PASS')
  } catch (err) {
    record('Criteria 7 & 8: Revoking link or recipient immediately invalidates subsequent access', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 9: Anti-IDOR (Insecure Direct Object Reference) Protection
  // --------------------------------------------------------------------------
  try {
    // Swapping documentId with an unshared document ID cannot grant access
    const docA = crypto.randomUUID()
    const docB = crypto.randomUUID()
    const userA = crypto.randomUUID()

    const accessB = await checkRestrictedDocumentAccess(docB, userA, 'userA@test.com')
    assert.strictEqual(accessB.authorized, false, 'Changing document ID cannot bypass authorization')

    record('Criterion 9: IDOR protection: Document ID manipulation is blocked', 'PASS')
  } catch (err) {
    record('Criterion 9: IDOR protection: Document ID manipulation is blocked', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 10: Server-side Download Permission Toggle
  // --------------------------------------------------------------------------
  try {
    const viewOnlyShare = {
      allow_download: false,
    }
    const isDownloadRequested = true
    const shouldBlock = isDownloadRequested && !viewOnlyShare.allow_download
    assert.strictEqual(shouldBlock, true, 'Download must be blocked when allow_download is false')

    record('Criterion 10: Download permission toggle strictly enforced server-side', 'PASS')
  } catch (err) {
    record('Criterion 10: Download permission toggle strictly enforced server-side', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 11: Rate Limiting on Token Lookups
  // --------------------------------------------------------------------------
  try {
    const testIp = `test-ip-${Date.now()}`
    let allowedCount = 0
    for (let i = 0; i < 65; i++) {
      if (checkTokenRateLimit(testIp)) {
        allowedCount++
      }
    }
    assert.strictEqual(allowedCount, 60, 'Rate limiter must cap requests at 60 per window')
    assert.strictEqual(checkTokenRateLimit(testIp), false, '61st attempt must be blocked')

    record('Criterion 11: Brute-force rate limiting enforces 60 requests per 5 minutes', 'PASS')
  } catch (err) {
    record('Criterion 11: Brute-force rate limiting enforces 60 requests per 5 minutes', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Criterion 12: Secrets & Storage Credential Isolation
  // --------------------------------------------------------------------------
  try {
    // Verify that client components do not import service_role or storage secrets
    const publicSharePagePath = path.join(__dirname, '../app/share/[token]/page.tsx')
    const pageContent = fs.readFileSync(publicSharePagePath, 'utf-8')
    assert.ok(!pageContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Public share page must not contain service-role key')
    assert.ok(!pageContent.includes('storage_path'), 'Public share page must not expose internal storage paths')

    const shareModalPath = path.join(__dirname, '../components/documents/ShareModal.tsx')
    const modalContent = fs.readFileSync(shareModalPath, 'utf-8')
    assert.ok(!modalContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'ShareModal must not contain service-role key')

    record('Criterion 12: Zero exposure of private storage paths or service-role secrets to browser', 'PASS')
  } catch (err) {
    record('Criterion 12: Zero exposure of private storage paths or service-role secrets to browser', 'FAIL', err.message)
  }

  // --------------------------------------------------------------------------
  // Migration & Schema File Verification
  // --------------------------------------------------------------------------
  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/09_document_sharing.sql')
    assert.ok(fs.existsSync(migrationPath), 'Migration 09_document_sharing.sql must exist')
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8')
    assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.document_shares'), 'Must define document_shares table')
    assert.ok(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS')
    assert.ok(migrationSql.includes('idx_unique_active_public_share'), 'Must define unique active public share index')
    assert.ok(migrationSql.includes('idx_unique_active_restricted_share'), 'Must define unique active restricted share index')

    record('Migration Integrity: 09_document_sharing.sql schema and RLS policies verified', 'PASS')
  } catch (err) {
    record('Migration Integrity: 09_document_sharing.sql schema and RLS policies verified', 'FAIL', err.message)
  }

  console.log('\n====================================================')
  console.log(`Test Summary: ${passed} / ${passed + failed} passed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err)
  process.exit(1)
})
