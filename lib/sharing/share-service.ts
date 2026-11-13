import crypto from 'crypto'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

export type SharingMode = 'public' | 'restricted'

export interface DocumentShare {
  id: string
  document_id: string
  owner_id: string
  sharing_mode: SharingMode
  token_hash: string | null
  recipient_email: string | null
  recipient_user_id: string | null
  allow_download: boolean
  expires_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface PublicShareValidationResult {
  valid: boolean
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'RATE_LIMITED' | 'SCHEMA_ERROR'
  share?: DocumentShare
  document?: {
    id: string
    filename: string
    file_size: number | null
    mime_type: string | null
    storage_path: string
    storage_provider?: string | null
    created_at: string
  }
}

// In-memory rate limiting for public token lookups: 60 requests per 5 minutes per IP/identifier
interface RateLimitBucket {
  count: number
  resetTime: number
}
const rateLimitMap = new Map<string, RateLimitBucket>()
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS_PER_WINDOW = 60

export function checkTokenRateLimit(identifier: string): boolean {
  const now = Date.now()
  const bucket = rateLimitMap.get(identifier)

  if (!bucket || now >= bucket.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    })
    return true
  }

  if (bucket.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return false
  }

  bucket.count += 1
  return true
}

export function generateShareToken(): { rawToken: string; tokenHash: string } {
  // 32 cryptographically secure bytes -> 43 base64url characters
  const rawToken = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashShareToken(rawToken)
  return { rawToken, tokenHash }
}

export function hashShareToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex')
}

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for share service administration')
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Creates or updates the active public share link for a document.
 */
export async function createPublicShare(
  supabase: SupabaseClient,
  params: {
    documentId: string
    ownerId: string
    allowDownload?: boolean
    expiresAt?: Date | null
  }
): Promise<{ share: DocumentShare; rawToken: string }> {
  const { rawToken, tokenHash } = generateShareToken()
  const allowDownload = params.allowDownload ?? true
  const expiresAt = params.expiresAt ? params.expiresAt.toISOString() : null

  // Check if active public share already exists; if so, revoke or replace it
  const admin = getAdminClient()

  // First revoke any existing active public share for this document
  await admin
    .from('document_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('document_id', params.documentId)
    .eq('sharing_mode', 'public')
    .is('revoked_at', null)

  const { data, error } = await admin
    .from('document_shares')
    .insert({
      document_id: params.documentId,
      owner_id: params.ownerId,
      sharing_mode: 'public',
      token_hash: tokenHash,
      allow_download: allowDownload,
      expires_at: expiresAt,
      revoked_at: null,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create public share')
  }

  return { share: data as DocumentShare, rawToken }
}

/**
 * Creates a restricted share for an authenticated recipient user by email.
 */
export async function createRestrictedShare(
  supabase: SupabaseClient,
  params: {
    documentId: string
    ownerId: string
    recipientEmail: string
    allowDownload?: boolean
    expiresAt?: Date | null
  }
): Promise<{ share: DocumentShare }> {
  const admin = getAdminClient()
  const email = params.recipientEmail.trim().toLowerCase()
  const allowDownload = params.allowDownload ?? true
  const expiresAt = params.expiresAt ? params.expiresAt.toISOString() : null

  // Lookup if recipient user exists in auth.users
  let recipientUserId: string | null = null
  try {
    const { data: usersData } = await admin.auth.admin.listUsers()
    const foundUser = usersData?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email
    )
    if (foundUser) {
      recipientUserId = foundUser.id
    }
  } catch {}

  // Revoke existing active share for this recipient if any
  await admin
    .from('document_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('document_id', params.documentId)
    .eq('sharing_mode', 'restricted')
    .eq('recipient_email', email)
    .is('revoked_at', null)

  const { data, error } = await admin
    .from('document_shares')
    .insert({
      document_id: params.documentId,
      owner_id: params.ownerId,
      sharing_mode: 'restricted',
      recipient_email: email,
      recipient_user_id: recipientUserId,
      allow_download: allowDownload,
      expires_at: expiresAt,
      revoked_at: null,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create restricted share')
  }

  return { share: data as DocumentShare }
}

/**
 * Fetches all shares (public and restricted) for a document owned by user.
 */
export async function getDocumentShares(
  documentId: string,
  ownerId: string
): Promise<{
  publicShare: DocumentShare | null
  restrictedShares: DocumentShare[]
}> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('document_shares')
    .select('*')
    .eq('document_id', documentId)
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') {
      return { publicShare: null, restrictedShares: [] }
    }
    throw new Error(error.message)
  }

  const shares = (data || []) as DocumentShare[]
  const publicShare = shares.find((s) => s.sharing_mode === 'public') || null
  const restrictedShares = shares.filter((s) => s.sharing_mode === 'restricted')

  return { publicShare, restrictedShares }
}

/**
 * Revokes a specific share by ID.
 */
export async function revokeShare(
  shareId: string,
  ownerId: string
): Promise<boolean> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('document_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
    .eq('owner_id', ownerId)

  if (error) throw new Error(error.message)
  return true
}

/**
 * Updates allow_download or expires_at for an active share.
 */
export async function updateShareSettings(
  shareId: string,
  ownerId: string,
  updates: { allowDownload?: boolean; expiresAt?: Date | null }
): Promise<DocumentShare> {
  const admin = getAdminClient()
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.allowDownload !== undefined) {
    payload.allow_download = updates.allowDownload
  }
  if (updates.expiresAt !== undefined) {
    payload.expires_at = updates.expiresAt ? updates.expiresAt.toISOString() : null
  }

  const { data, error } = await admin
    .from('document_shares')
    .update(payload)
    .eq('id', shareId)
    .eq('owner_id', ownerId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to update share')
  return data as DocumentShare
}

/**
 * Validates a public share token and returns document metadata if active and unexpired.
 */
export async function validatePublicShareToken(
  rawToken: string,
  clientIp: string = '127.0.0.1'
): Promise<PublicShareValidationResult> {
  if (!checkTokenRateLimit(clientIp)) {
    return { valid: false, reason: 'RATE_LIMITED' }
  }

  if (!rawToken || rawToken.trim().length < 20) {
    return { valid: false, reason: 'NOT_FOUND' }
  }

  const tokenHash = hashShareToken(rawToken)
  const admin = getAdminClient()

  const { data: share, error: shareError } = await admin
    .from('document_shares')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('sharing_mode', 'public')
    .single()

  if (shareError || !share) {
    if (shareError?.code === '42P01') {
      return { valid: false, reason: 'SCHEMA_ERROR' }
    }
    return { valid: false, reason: 'NOT_FOUND' }
  }

  if (share.revoked_at) {
    return { valid: false, reason: 'REVOKED', share }
  }

  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    return { valid: false, reason: 'EXPIRED', share }
  }

  // Fetch document details securely without exposing sensitive fields
  const { data: doc, error: docError } = await admin
    .from('documents')
    .select('id, filename, file_size, mime_type, storage_path, storage_provider, created_at')
    .eq('id', share.document_id)
    .single()

  if (docError || !doc) {
    return { valid: false, reason: 'NOT_FOUND', share }
  }

  return {
    valid: true,
    share,
    document: doc,
  }
}

/**
 * Checks if a registered user is authorized to access a restricted document.
 */
export async function checkRestrictedDocumentAccess(
  documentId: string,
  userId: string,
  userEmail?: string
): Promise<{
  authorized: boolean
  allowDownload: boolean
  shareId?: string
}> {
  const admin = getAdminClient()
  const email = (userEmail || '').trim().toLowerCase()

  const { data: shares, error } = await admin
    .from('document_shares')
    .select('*')
    .eq('document_id', documentId)
    .eq('sharing_mode', 'restricted')
    .is('revoked_at', null)

  if (error || !shares || shares.length === 0) {
    return { authorized: false, allowDownload: false }
  }

  const activeShare = shares.find((s) => {
    if (s.expires_at && new Date(s.expires_at).getTime() <= Date.now()) {
      return false
    }
    if (s.recipient_user_id && s.recipient_user_id === userId) {
      return true
    }
    if (email && s.recipient_email && s.recipient_email.toLowerCase() === email) {
      return true
    }
    return false
  })

  if (!activeShare) {
    return { authorized: false, allowDownload: false }
  }

  return {
    authorized: true,
    allowDownload: Boolean(activeShare.allow_download),
    shareId: activeShare.id,
  }
}
