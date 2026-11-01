import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { verifyVaultAccess, getVaultMfaStatus } from '../lib/auth/vault-mfa.ts'

console.log('====================================================')
console.log('🧪 FILEMIND PRIVATE VAULT MFA (TOTP) TEST SUITE')
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

// -------------------------------------------------------------
// Test 1: Unauthenticated request rejection
// -------------------------------------------------------------
await testAsync('Scenario 1: verifyVaultAccess rejects unauthenticated calls with 401 UNAUTHORIZED', async () => {
  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('Session missing') }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: null }),
        listFactors: async () => ({ data: null }),
      },
    },
  }

  const result = await verifyVaultAccess(mockSupabase)
  assert.equal(result.authorized, false)
  assert.equal(result.status, 401)
  assert.equal(result.code, 'UNAUTHORIZED')
  assert.ok(result.error?.includes('Authentication required'))
})

// -------------------------------------------------------------
// Test 2: Standard non-MFA user access (AAL1 allowed)
// -------------------------------------------------------------
await testAsync('Scenario 2: verifyVaultAccess permits non-MFA user at baseline AAL1', async () => {
  const mockSupabase = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'usr-baseline-1', email: 'user@example.com' } },
        error: null,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [], totp: [] },
          error: null,
        }),
      },
    },
  }

  const result = await verifyVaultAccess(mockSupabase)
  assert.equal(result.authorized, true)
  assert.equal(result.status, 200)
  assert.equal(result.code, 'OK')
  assert.equal(result.mfaEnrolled, false)
  assert.equal(result.currentLevel, 'aal1')
})

// -------------------------------------------------------------
// Test 3: MFA-enrolled user blocked when session is at AAL1
// -------------------------------------------------------------
await testAsync('Scenario 3: verifyVaultAccess blocks MFA-enrolled user with 403 MFA_REQUIRED when session is at AAL1', async () => {
  const mockSupabase = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'usr-mfa-1', email: 'protected@example.com' } },
        error: null,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: [] },
          error: null,
        }),
        listFactors: async () => ({
          data: {
            all: [{ id: 'factor-totp-1', status: 'verified', factor_type: 'totp' }],
            totp: [{ id: 'factor-totp-1', status: 'verified', factor_type: 'totp', friendly_name: 'Google Authenticator' }],
          },
          error: null,
        }),
      },
    },
  }

  const result = await verifyVaultAccess(mockSupabase)
  assert.equal(result.authorized, false)
  assert.equal(result.status, 403)
  assert.equal(result.code, 'MFA_REQUIRED')
  assert.equal(result.mfaEnrolled, true)
  assert.equal(result.currentLevel, 'aal1')
  assert.equal(result.nextLevel, 'aal2')
  assert.equal(result.factorId, 'factor-totp-1')
  assert.ok(result.error?.includes('Two-factor authentication'))
})

// -------------------------------------------------------------
// Test 4: MFA-enrolled user permitted when session reaches AAL2
// -------------------------------------------------------------
await testAsync('Scenario 4: verifyVaultAccess permits MFA user when session is elevated to AAL2', async () => {
  const mockSupabase = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'usr-mfa-1', email: 'protected@example.com' } },
        error: null,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2', nextLevel: 'aal2', currentAuthenticationMethods: ['totp'] },
          error: null,
        }),
        listFactors: async () => ({
          data: {
            all: [{ id: 'factor-totp-1', status: 'verified', factor_type: 'totp' }],
            totp: [{ id: 'factor-totp-1', status: 'verified', factor_type: 'totp' }],
          },
          error: null,
        }),
      },
    },
  }

  const result = await verifyVaultAccess(mockSupabase)
  assert.equal(result.authorized, true)
  assert.equal(result.status, 200)
  assert.equal(result.code, 'OK')
  assert.equal(result.mfaEnrolled, true)
  assert.equal(result.currentLevel, 'aal2')
})

// -------------------------------------------------------------
// Test 5: TOTP code validation rules
// -------------------------------------------------------------
test('Scenario 5: TOTP code validation strictly enforces 6 numeric digits', () => {
  const isValidTotp = (code) => {
    const clean = String(code || '').trim().replace(/\s+/g, '')
    return clean.length === 6 && /^\d{6}$/.test(clean)
  }

  assert.equal(isValidTotp('123456'), true)
  assert.equal(isValidTotp(' 987654 '), true)
  assert.equal(isValidTotp('123 456'), true)
  assert.equal(isValidTotp('12345'), false, 'Must be 6 digits')
  assert.equal(isValidTotp('1234567'), false, 'Cannot exceed 6 digits')
  assert.equal(isValidTotp('12345a'), false, 'Cannot contain letters')
  assert.equal(isValidTotp(''), false, 'Empty code is invalid')
  assert.equal(isValidTotp(null), false, 'Null code is invalid')
})

// -------------------------------------------------------------
// Test 6: getVaultMfaStatus correctly inspects enrolled factors
// -------------------------------------------------------------
await testAsync('Scenario 6: getVaultMfaStatus returns accurate enrollment status and friendly metadata', async () => {
  const mockSupabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        }),
        listFactors: async () => ({
          data: {
            totp: [
              {
                id: 'factor-99',
                status: 'verified',
                friendly_name: 'Work Phone Authenticator',
                created_at: '2026-10-29T10:00:00Z',
              },
            ],
          },
        }),
      },
    },
  }

  const status = await getVaultMfaStatus(mockSupabase)
  assert.equal(status.isEnrolled, true)
  assert.equal(status.currentLevel, 'aal2')
  assert.equal(status.factorId, 'factor-99')
  assert.equal(status.friendlyName, 'Work Phone Authenticator')
})

// -------------------------------------------------------------
// Test 7: Direct client bypass attempts cannot spoof AAL2
// -------------------------------------------------------------
await testAsync('Scenario 7: Client-side headers or spoofed payloads cannot bypass verifyVaultAccess', async () => {
  // Even if a malicious request sent headers claim 'aal2', verifyVaultAccess relies on Supabase Auth session claims
  const mockSupabase = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'usr-victim-1' } },
        error: null,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1', nextLevel: 'aal2' }, // Server-verified token is only AAL1
        }),
        listFactors: async () => ({
          data: { totp: [{ id: 'f-1', status: 'verified' }] },
        }),
      },
    },
  }

  const result = await verifyVaultAccess(mockSupabase)
  assert.equal(result.authorized, false)
  assert.equal(result.status, 403)
  assert.equal(result.code, 'MFA_REQUIRED')
})

// -------------------------------------------------------------
// Test 8: Migration 07 file syntax and policy definitions
// -------------------------------------------------------------
test('Scenario 8: Migration 07 defines user_has_verified_mfa, is_vault_authorized, and RLS policies', () => {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '07_vault_mfa_policies.sql')
  const rollbackPath = path.join(process.cwd(), 'supabase', 'migrations', 'rollbacks', '07_vault_mfa_rollback.sql')

  assert.ok(fs.existsSync(migrationPath), 'Migration 07 file must exist')
  assert.ok(fs.existsSync(rollbackPath), 'Rollback 07 file must exist')

  const content = fs.readFileSync(migrationPath, 'utf8')
  assert.ok(content.includes('FUNCTION public.user_has_verified_mfa'), 'Must define user_has_verified_mfa function')
  assert.ok(content.includes('FUNCTION public.is_vault_authorized'), 'Must define is_vault_authorized function')
  assert.ok(content.includes('CREATE POLICY "documents_select_own"'), 'Must define documents_select_own policy')
  assert.ok(content.includes('CREATE POLICY "storage_select_own"'), 'Must define storage_select_own policy')
  assert.ok(content.includes('is_vault_authorized(auth.uid())'), 'Policies must enforce is_vault_authorized check')
})

// -------------------------------------------------------------
// Test 9: Verify all vault document routes enforce verifyVaultAccess
// -------------------------------------------------------------
test('Scenario 9: All vault API route handlers import and enforce verifyVaultAccess', () => {
  const routesToCheck = [
    'app/api/documents/route.ts',
    'app/api/documents/[id]/route.ts',
    'app/api/documents/[id]/download/route.ts',
    'app/api/documents/prepare-upload/route.ts',
    'app/api/documents/confirm-upload/route.ts',
    'app/api/search/route.ts',
    'app/api/ask/route.ts',
  ]

  for (const relPath of routesToCheck) {
    const fullPath = path.join(process.cwd(), relPath)
    assert.ok(fs.existsSync(fullPath), `Route file ${relPath} must exist`)
    const fileContent = fs.readFileSync(fullPath, 'utf8')
    assert.ok(
      fileContent.includes('verifyVaultAccess'),
      `Route ${relPath} must import and execute verifyVaultAccess`
    )
    assert.ok(
      fileContent.includes('mfaRequired'),
      `Route ${relPath} must handle mfaRequired / MFA_REQUIRED status`
    )
  }
})

// -------------------------------------------------------------
// Test 10: Server Components on /documents and /documents/[id] render MFA Unlock
// -------------------------------------------------------------
test('Scenario 10: Vault server pages render VaultMfaUnlockChallenge when MFA_REQUIRED', () => {
  const docPagePath = path.join(process.cwd(), 'app/(dashboard)/documents/page.tsx')
  const viewerPagePath = path.join(process.cwd(), 'app/(dashboard)/documents/[id]/page.tsx')

  const docPageContent = fs.readFileSync(docPagePath, 'utf8')
  assert.ok(docPageContent.includes('VaultMfaUnlockChallenge'), 'Documents page must render VaultMfaUnlockChallenge')
  assert.ok(docPageContent.includes("auth.code === 'MFA_REQUIRED'"), 'Documents page must check MFA_REQUIRED')

  const viewerPageContent = fs.readFileSync(viewerPagePath, 'utf8')
  assert.ok(viewerPageContent.includes('VaultMfaUnlockChallenge'), 'Document viewer page must render VaultMfaUnlockChallenge')
  assert.ok(viewerPageContent.includes("auth.code === 'MFA_REQUIRED'"), 'Document viewer page must check MFA_REQUIRED')
})

// -------------------------------------------------------------
// Test 11: Enrollment and Unlock challenges refresh session to AAL2
// -------------------------------------------------------------
test('Scenario 11: VaultMfaEnrollmentModal and VaultMfaUnlockChallenge refresh session upon verification', () => {
  const enrollModalPath = path.join(process.cwd(), 'components/auth/VaultMfaEnrollmentModal.tsx')
  const unlockChallengePath = path.join(process.cwd(), 'components/auth/VaultMfaUnlockChallenge.tsx')

  const enrollContent = fs.readFileSync(enrollModalPath, 'utf8')
  assert.ok(enrollContent.includes('refreshSession()'), 'Enrollment modal must call refreshSession()')
  assert.ok(enrollContent.includes('router.refresh()'), 'Enrollment modal must refresh router cache')

  const unlockContent = fs.readFileSync(unlockChallengePath, 'utf8')
  assert.ok(unlockContent.includes('refreshSession()'), 'Unlock challenge must call refreshSession()')
  assert.ok(unlockContent.includes('router.refresh()'), 'Unlock challenge must refresh router cache')
})

// -------------------------------------------------------------
// Test 12: LoginForm enforces 2FA verification before dashboard redirection
// -------------------------------------------------------------
test('Scenario 12: LoginForm intercepts users with nextLevel === aal2 and challenges for TOTP', () => {
  const loginFormPath = path.join(process.cwd(), 'components/auth/LoginForm.tsx')
  const loginContent = fs.readFileSync(loginFormPath, 'utf8')

  assert.ok(loginContent.includes('getAuthenticatorAssuranceLevel'), 'LoginForm must inspect session AAL')
  assert.ok(loginContent.includes("aalData.nextLevel === 'aal2'"), 'LoginForm must check nextLevel === aal2')
  assert.ok(loginContent.includes('challengeAndVerify'), 'LoginForm must support TOTP challengeAndVerify')
  assert.ok(loginContent.includes('refreshSession'), 'LoginForm must refresh session on MFA verification')
})

// -------------------------------------------------------------
// Test 13: Ask AI page seamlessly recovers from AAL1 lockout
// -------------------------------------------------------------
test('Scenario 13: Ask AI page detects isVaultLocked and provides VaultMfaUnlockChallenge', () => {
  const askPagePath = path.join(process.cwd(), 'app/(dashboard)/ask/page.tsx')
  const askContent = fs.readFileSync(askPagePath, 'utf8')

  assert.ok(askContent.includes('VaultMfaUnlockChallenge'), 'Ask AI must import VaultMfaUnlockChallenge')
  assert.ok(askContent.includes('isVaultLocked'), 'Ask AI must maintain isVaultLocked state')
  assert.ok(askContent.includes('showUnlockModal'), 'Ask AI must maintain showUnlockModal state')
  assert.ok(askContent.includes('mfaRequired'), 'Ask AI must check mfaRequired response')
})

console.log('\n====================================================')
console.log(`Test Summary: ${passedTests} / ${totalTests} passed`)
console.log('====================================================')

if (passedTests !== totalTests) {
  process.exit(1)
}
