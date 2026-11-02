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

const challengeCache = new Map<string, { challenge: string; expiresAt: number; userId: string; documentId?: string }>()

export function storeChallenge(userId: string, challenge: string, documentId?: string): string {
  const token = crypto.randomUUID()
  const expiresAt = Date.now() + 60 * 1000
  challengeCache.set(token, { challenge, expiresAt, userId, documentId })
  return token
}

export function consumeChallenge(token: string): { challenge: string; userId: string; documentId?: string } | null {
  const item = challengeCache.get(token)
  if (!item) return null
  challengeCache.delete(token)
  if (Date.now() > item.expiresAt) return null
  return { challenge: item.challenge, userId: item.userId, documentId: item.documentId }
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
