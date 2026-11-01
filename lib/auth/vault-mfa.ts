import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface VaultAuthResult {
  authorized: boolean
  status: 200 | 401 | 403
  code: 'OK' | 'UNAUTHORIZED' | 'MFA_REQUIRED'
  error?: string
  user?: User
  currentLevel?: 'aal1' | 'aal2'
  nextLevel?: 'aal1' | 'aal2'
  mfaEnrolled: boolean
  factorId?: string
}

export async function verifyVaultAccess(
  supabase: SupabaseClient
): Promise<VaultAuthResult> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        authorized: false,
        status: 401,
        code: 'UNAUTHORIZED',
        error: 'Authentication required to access Private Vault.',
        mfaEnrolled: false,
      }
    }

    let isVaultLockedCookie = false
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      isVaultLockedCookie = cookieStore.get('filemind_vault_locked')?.value === 'true'
    } catch {
      isVaultLockedCookie = false
    }

    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    const rawCurrentLevel = (aalData?.currentLevel as 'aal1' | 'aal2') || 'aal1'
    const currentLevel = isVaultLockedCookie ? 'aal1' : rawCurrentLevel
    const nextLevel = (aalData?.nextLevel as 'aal1' | 'aal2') || 'aal1'

    const { data: factorsData } =
      await supabase.auth.mfa.listFactors()

    const verifiedTotp = factorsData?.totp?.find(
      (factor) => factor.status === 'verified'
    )

    const mfaEnrolled = Boolean(verifiedTotp || nextLevel === 'aal2')

    if (mfaEnrolled && currentLevel !== 'aal2') {
      return {
        authorized: false,
        status: 403,
        code: 'MFA_REQUIRED',
        error:
          'Two-factor authentication (AAL2) required to access Private Vault documents.',
        user,
        currentLevel,
        nextLevel: 'aal2',
        mfaEnrolled: true,
        factorId: verifiedTotp?.id,
      }
    }

    return {
      authorized: true,
      status: 200,
      code: 'OK',
      user,
      currentLevel,
      nextLevel,
      mfaEnrolled,
      factorId: verifiedTotp?.id,
    }
  } catch (err: unknown) {
    console.error('[Vault MFA] Access verification error:', err)
    return {
      authorized: false,
      status: 401,
      code: 'UNAUTHORIZED',
      error: 'Security verification failed. Please re-authenticate.',
      mfaEnrolled: false,
    }
  }
}

export async function getVaultMfaStatus(supabase: SupabaseClient): Promise<{
  isEnrolled: boolean
  currentLevel: 'aal1' | 'aal2'
  nextLevel: 'aal1' | 'aal2'
  factorId?: string
  friendlyName?: string
  verifiedAt?: string
}> {
  let isVaultLockedCookie = false
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    isVaultLockedCookie = cookieStore.get('filemind_vault_locked')?.value === 'true'
  } catch {
    isVaultLockedCookie = false
  }

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: factorsData } = await supabase.auth.mfa.listFactors()

  const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified')
  const isEnrolled = Boolean(verifiedTotp)
  const rawCurrentLevel = (aalData?.currentLevel as 'aal1' | 'aal2') || 'aal1'
  const currentLevel = isVaultLockedCookie ? 'aal1' : rawCurrentLevel

  return {
    isEnrolled,
    currentLevel,
    nextLevel: (aalData?.nextLevel as 'aal1' | 'aal2') || 'aal1',
    factorId: verifiedTotp?.id,
    friendlyName: verifiedTotp?.friendly_name || undefined,
    verifiedAt: verifiedTotp?.updated_at || verifiedTotp?.created_at || undefined,
  }
}
