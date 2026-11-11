export interface AdminVerificationResult {
  isAuthorized: boolean
  reason?: string
  email?: string
}

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS || ''
  if (!raw.trim()) return []

  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
}

export function isEmailAuthorizedAdmin(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  const allowlist = getAdminAllowlist()
  if (allowlist.length === 0) return false

  return allowlist.includes(normalized)
}

export function verifyAdminUserCredentials(user?: {
  email?: string | null
  email_confirmed_at?: string | null
  confirmed_at?: string | null
  app_metadata?: Record<string, any>
} | null): AdminVerificationResult {
  if (!user || !user.email) {
    return {
      isAuthorized: false,
      reason: 'No user or email provided',
    }
  }

  const isVerified = Boolean(
    user.email_confirmed_at ||
    user.confirmed_at ||
    user.app_metadata?.provider === 'google'
  )

  if (!isVerified) {
    return {
      isAuthorized: false,
      reason: 'Email is not verified',
    }
  }

  const normalized = user.email.trim().toLowerCase()
  if (!isEmailAuthorizedAdmin(normalized)) {
    return {
      isAuthorized: false,
      reason: 'Email not present in ADMIN_EMAILS allowlist',
    }
  }

  return {
    isAuthorized: true,
    email: normalized,
  }
}
