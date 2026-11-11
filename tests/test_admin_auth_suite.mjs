import assert from 'node:assert'
import {
  isEmailAuthorizedAdmin,
  getAdminAllowlist,
  verifyAdminUserCredentials,
} from '../lib/admin/auth-core.ts'

async function runTests() {
  console.log('Testing FileMind Admin Authorization Suite...')

  const originalEnv = process.env.ADMIN_EMAILS

  process.env.ADMIN_EMAILS = 'jitendarswami316@gmail.com, admin@filemindhub.xyz , SECOND_ADMIN@EXAMPLE.COM'

  const allowlist = getAdminAllowlist()
  assert.strictEqual(allowlist.length, 3, 'Allowlist should parse 3 normalized emails')
  assert.ok(allowlist.includes('jitendarswami316@gmail.com'))
  assert.ok(allowlist.includes('admin@filemindhub.xyz'))
  assert.ok(allowlist.includes('second_admin@example.com'))
  console.log('PASS: Allowlist Parsing - Multiple comma-separated emails normalized and trimmed')

  assert.strictEqual(isEmailAuthorizedAdmin('jitendarswami316@gmail.com'), true)
  assert.strictEqual(isEmailAuthorizedAdmin('JitendarSwami316@GMAIL.COM'), true)
  assert.strictEqual(isEmailAuthorizedAdmin('  jitendarswami316@gmail.com  '), true)
  assert.strictEqual(isEmailAuthorizedAdmin('admin@filemindhub.xyz'), true)
  assert.strictEqual(isEmailAuthorizedAdmin('second_admin@example.com'), true)
  console.log('PASS: Case & Whitespace Normalization - Exact case-insensitive matches verified')

  assert.strictEqual(isEmailAuthorizedAdmin('unauthorized@example.com'), false)
  assert.strictEqual(isEmailAuthorizedAdmin('hacker@evil.com'), false)
  assert.strictEqual(isEmailAuthorizedAdmin('jitendarswami316@gmail.co'), false)
  assert.strictEqual(isEmailAuthorizedAdmin(''), false)
  assert.strictEqual(isEmailAuthorizedAdmin(null), false)
  assert.strictEqual(isEmailAuthorizedAdmin(undefined), false)
  console.log('PASS: Unauthorized Rejection - Non-allowlisted and invalid emails rejected')

  process.env.ADMIN_EMAILS = ''
  assert.strictEqual(isEmailAuthorizedAdmin('jitendarswami316@gmail.com'), false)
  assert.strictEqual(getAdminAllowlist().length, 0)

  delete process.env.ADMIN_EMAILS
  assert.strictEqual(isEmailAuthorizedAdmin('jitendarswami316@gmail.com'), false)
  console.log('PASS: Fail Closed Invariant - Empty or missing ADMIN_EMAILS denies all access')

  process.env.ADMIN_EMAILS = 'jitendarswami316@gmail.com'

  const verifiedUser = {
    email: 'jitendarswami316@gmail.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
  }
  const verifiedRes = verifyAdminUserCredentials(verifiedUser)
  assert.strictEqual(verifiedRes.isAuthorized, true)
  assert.strictEqual(verifiedRes.email, 'jitendarswami316@gmail.com')

  const unconfirmedUser = {
    email: 'jitendarswami316@gmail.com',
    email_confirmed_at: null,
  }
  const unconfirmedRes = verifyAdminUserCredentials(unconfirmedUser)
  assert.strictEqual(unconfirmedRes.isAuthorized, false)
  assert.strictEqual(unconfirmedRes.reason, 'Email is not verified')
  console.log('PASS: Email Verification Gate - Unverified emails are strictly rejected')

  const unauthorizedVerifiedUser = {
    email: 'random@example.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
  }
  const unauthorizedRes = verifyAdminUserCredentials(unauthorizedVerifiedUser)
  assert.strictEqual(unauthorizedRes.isAuthorized, false)
  assert.strictEqual(unauthorizedRes.reason, 'Email not present in ADMIN_EMAILS allowlist')
  console.log('PASS: Allowlist Enforcement - Verified non-admin emails are rejected')

  process.env.ADMIN_EMAILS = originalEnv

  console.log('All FileMind Admin Authorization tests completed successfully!')
}

runTests().catch((err) => {
  console.error('Admin Auth Test failed:', err)
  process.exit(1)
})
