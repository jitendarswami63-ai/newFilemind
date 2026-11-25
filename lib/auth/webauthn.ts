import crypto from 'node:crypto'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getRpConfig(reqOrUrl?: Request | string) {
  let hostname = 'localhost'
  let origin = 'http://localhost:3000'

  if (typeof reqOrUrl === 'object' && reqOrUrl !== null && 'headers' in reqOrUrl) {
    const hostHeader = reqOrUrl.headers.get('x-forwarded-host') || reqOrUrl.headers.get('host')
    const protoHeader = reqOrUrl.headers.get('x-forwarded-proto') || (hostHeader?.includes('localhost') ? 'http' : 'https')
    if (hostHeader) {
      hostname = hostHeader.split(':')[0]
      origin = `${protoHeader}://${hostHeader}`
    } else {
      try {
        const u = new URL(reqOrUrl.url)
        hostname = u.hostname
        origin = u.origin
      } catch {}
    }
  } else if (typeof reqOrUrl === 'string') {
    try {
      const u = new URL(reqOrUrl)
      hostname = u.hostname
      origin = u.origin
    } catch {}
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const u = new URL(process.env.NEXT_PUBLIC_APP_URL)
      hostname = u.hostname
      origin = u.origin
    } catch {}
  }

  // W3C WebAuthn spec: RP ID must equal the origin's effective domain or a registrable suffix.
  // For filemindhub.xyz and any subdomains (like www.filemindhub.xyz), set rpID to 'filemindhub.xyz'
  // so credentials can be registered and asserted across both www and non-www origins.
  let rpID = hostname
  if (hostname.endsWith('.filemindhub.xyz') || hostname === 'filemindhub.xyz') {
    rpID = 'filemindhub.xyz'
  } else if (hostname.startsWith('www.')) {
    rpID = hostname.slice(4)
  }

  return {
    rpName: 'FileMind Biometric Vault',
    rpID,
    origin,
  }
}

export function getAllowedOrigins(origin: string): string[] {
  const list = [
    origin,
    origin.replace('://www.', '://'),
    origin.replace('://', '://www.'),
    'https://www.filemindhub.xyz',
    'https://filemindhub.xyz',
    'http://localhost:3000',
  ]
  if (process.env.NEXT_PUBLIC_APP_URL) {
    list.push(process.env.NEXT_PUBLIC_APP_URL)
  }
  return Array.from(new Set(list))
}

export function getAllowedRPIDs(rpID: string): string[] {
  return Array.from(new Set([
    rpID,
    'filemindhub.xyz',
    'www.filemindhub.xyz',
    'localhost',
  ]))
}

export function getServiceRoleClient(): SupabaseClient {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex')
const consumedChallengeJtis = new Map<string, number>()

function getChallengeHmacSecret(): string {
  return (
    process.env.WEBAUTHN_CHALLENGE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CRON_SECRET ||
    EPHEMERAL_FALLBACK_SECRET
  )
}

function pruneConsumedJtis(now: number): void {
  if (consumedChallengeJtis.size < 2000) return
  for (const [jti, exp] of consumedChallengeJtis.entries()) {
    if (now > exp) {
      consumedChallengeJtis.delete(jti)
    }
  }
}

export function storeChallenge(userId: string, challenge: string, documentId?: string): string {
  const jti = crypto.randomUUID()
  const expiresAt = Date.now() + 60 * 1000
  const payload = Buffer.from(
    JSON.stringify({ jti, userId, challenge, documentId, expiresAt }),
    'utf8'
  ).toString('base64url')
  const sig = crypto
    .createHmac('sha256', getChallengeHmacSecret())
    .update(payload)
    .digest('base64url')
  return `${payload}.${sig}`
}

export function consumeChallenge(token: string): { challenge: string; userId: string; documentId?: string } | null {
  if (!token || typeof token !== 'string') return null
  const dotIdx = token.indexOf('.')
  if (dotIdx <= 0) return null

  const payload = token.slice(0, dotIdx)
  const providedSig = token.slice(dotIdx + 1)
  if (!payload || !providedSig) return null

  const expectedSig = crypto
    .createHmac('sha256', getChallengeHmacSecret())
    .update(payload)
    .digest('base64url')

  const expectedBuf = Buffer.from(expectedSig, 'utf8')
  const providedBuf = Buffer.from(providedSig, 'utf8')
  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      jti?: string
      challenge?: string
      userId?: string
      documentId?: string
      expiresAt?: number
    }

    const now = Date.now()
    if (!parsed.jti || !parsed.challenge || !parsed.userId || !parsed.expiresAt || now > parsed.expiresAt) {
      return null
    }

    pruneConsumedJtis(now)
    if (consumedChallengeJtis.has(parsed.jti)) {
      return null
    }
    consumedChallengeJtis.set(parsed.jti, parsed.expiresAt)

    return {
      challenge: parsed.challenge,
      userId: parsed.userId,
      documentId: parsed.documentId,
    }
  } catch {
    return null
  }
}

export async function createBiometricLease(
  userId: string,
  documentId: string,
  credentialId?: string,
  sessionFingerprint: string = 'browser-session',
  ttlMinutes: number = 15
): Promise<{ leaseId: string; expiresAt: string }> {
  const supabaseAdmin = getServiceRoleClient()
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('biometric_leases')
    .insert({
      user_id: userId,
      document_id: documentId,
      credential_id: credentialId || null,
      session_fingerprint: sessionFingerprint,
      expires_at: expiresAt,
    })
    .select('id, expires_at')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to register biometric lease')
  }

  return { leaseId: data.id, expiresAt: data.expires_at }
}

export async function hasActiveBiometricLease(
  userId: string,
  documentId: string
): Promise<boolean> {
  const supabaseAdmin = getServiceRoleClient()
  const now = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('biometric_leases')
    .select('id')
    .eq('user_id', userId)
    .eq('document_id', documentId)
    .gt('expires_at', now)
    .is('revoked_at', null)
    .limit(1)

  if (error || !data || data.length === 0) {
    return false
  }

  return true
}

export async function revokeBiometricLease(
  userId: string,
  documentId?: string
): Promise<void> {
  const supabaseAdmin = getServiceRoleClient()
  const now = new Date().toISOString()

  let q = supabaseAdmin
    .from('biometric_leases')
    .update({ revoked_at: now })
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (documentId) {
    q = q.eq('document_id', documentId)
  }

  await q
}

export async function listUserBiometricCredentials(userId: string) {
  const supabaseAdmin = getServiceRoleClient()
  const { data, error } = await supabaseAdmin
    .from('biometric_credentials')
    .select('id, credential_id, device_name, authenticator_type, aaguid, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function deleteBiometricCredential(userId: string, credentialId: string) {
  const supabaseAdmin = getServiceRoleClient()
  const { data, error: firstError } = await supabaseAdmin
    .from('biometric_credentials')
    .delete()
    .eq('user_id', userId)
    .eq('credential_id', credentialId)
    .select('id')

  let finalError = firstError

  if (!firstError && (!data || data.length === 0) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentialId)) {
    const res = await supabaseAdmin
      .from('biometric_credentials')
      .delete()
      .eq('user_id', userId)
      .eq('id', credentialId)
    finalError = res.error
  }

  if (finalError) {
    throw new Error(finalError.message)
  }

  await revokeBiometricLease(userId)
}
