import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { envelopeDecryptDocument } from '@/lib/crypto/document-encryption'
import { getServiceRoleClient, hasActiveBiometricLease } from '@/lib/auth/webauthn'
import { storageService, StorageProvider } from '@/lib/storage/storage-service'

export const dynamic = 'force-dynamic'

function createFileStreamResponse(
  buffer: Buffer,
  filename: string,
  rawMimeType: string | undefined,
  cacheControl: string,
  rangeHeader?: string | null
): Response {
  let safeMime = rawMimeType || 'application/octet-stream'
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (safeMime === 'text/html' || safeMime === 'application/xhtml+xml') {
    safeMime = 'text/plain; charset=utf-8'
  }

  const isTextOrCode = safeMime.startsWith('text/') || ['json', 'xml', 'js', 'ts', 'jsx', 'tsx', 'py', 'sql', 'yaml', 'toml', 'css'].includes(ext)
  if (isTextOrCode && !safeMime.includes('charset')) {
    safeMime = `${safeMime}; charset=utf-8`
  }

  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1

    if (!isNaN(start) && start < buffer.length && end >= start) {
      const safeEnd = Math.min(end, buffer.length - 1)
      const chunk = buffer.subarray(start, safeEnd + 1)

      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          'Content-Type': safeMime,
          'Content-Range': `bytes ${start}-${safeEnd}/${buffer.length}`,
          'Content-Length': chunk.length.toString(),
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
          'Cache-Control': cacheControl,
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }
  }

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': safeMime,
      'Content-Length': buffer.length.toString(),
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': cacheControl,
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized || !auth.user) {
    return new Response(null, { status: auth.status })
  }

  const supabaseAdmin = getServiceRoleClient()
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, is_locked')
    .eq('id', documentId)
    .eq('user_id', auth.user.id)
    .single()

  if (fetchError || !doc) {
    return new Response(null, { status: 404 })
  }

  if (doc.is_locked) {
    const isLeaseActive = await hasActiveBiometricLease(auth.user.id, documentId)
    if (!isLeaseActive) {
      return new Response(null, { status: 403 })
    }
  }

  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Accept-Ranges': 'bytes',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { error: auth.error, code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user

  const supabaseAdmin = getServiceRoleClient()
  let { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, filename, mime_type, storage_path, storage_provider, is_locked, encrypted_dek, dek_iv, dek_tag, file_iv, file_tag, key_version')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchError && (fetchError.code === '42703' || fetchError.message?.includes('storage_provider'))) {
    const fallback = await supabaseAdmin
      .from('documents')
      .select('id, user_id, filename, mime_type, storage_path, is_locked, encrypted_dek, dek_iv, dek_tag, file_iv, file_tag, key_version')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()
    if (fallback.data) {
      doc = { ...fallback.data, storage_provider: undefined }
      fetchError = null
    }
  }

  if (fetchError || !doc) {
    if (user.email) {
      const { data: shareAccess } = await supabase
        .from('document_shares')
        .select('id, expires_at, status')
        .eq('document_id', documentId)
        .eq('recipient_email', user.email)
        .eq('status', 'active')
        .single()

      if (shareAccess) {
        const isExpired = shareAccess.expires_at && new Date(shareAccess.expires_at) < new Date()
        if (!isExpired) {
          const { data: sharedDoc, error: sharedErr } = await supabaseAdmin
            .from('documents')
            .select('id, user_id, filename, mime_type, storage_path, storage_provider, is_locked, encrypted_dek, dek_iv, dek_tag, file_iv, file_tag, key_version')
            .eq('id', documentId)
            .single()

          if (sharedDoc) {
            doc = sharedDoc
            fetchError = null
          } else if (sharedErr && (sharedErr.code === '42703' || sharedErr.message?.includes('storage_provider'))) {
            const { data: sharedFallback } = await supabaseAdmin
              .from('documents')
              .select('id, user_id, filename, mime_type, storage_path, is_locked, encrypted_dek, dek_iv, dek_tag, file_iv, file_tag, key_version')
              .eq('id', documentId)
              .single()
            if (sharedFallback) {
              doc = { ...sharedFallback, storage_provider: undefined }
              fetchError = null
            }
          }
        }
      }
    }
  }

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.is_locked) {
    const isLeaseActive = await hasActiveBiometricLease(user.id, documentId)
    if (!isLeaseActive) {
      return NextResponse.json(
        {
          error: 'This document is locked with Windows Hello / Touch ID. Biometric authorization required to view.',
          code: 'BIOMETRIC_REQUIRED',
          is_locked: true,
          documentId,
        },
        { status: 403 }
      )
    }

    let ciphertextBuffer: Buffer
    try {
      const { buffer } = await storageService.downloadBuffer(
        doc.storage_path,
        (doc.storage_provider as StorageProvider) || undefined
      )
      ciphertextBuffer = buffer
    } catch {
      return NextResponse.json({ error: 'Failed to retrieve encrypted document' }, { status: 500 })
    }

    let plaintextBuffer: Buffer
    try {
      plaintextBuffer = envelopeDecryptDocument(
        ciphertextBuffer,
        doc.encrypted_dek!,
        doc.dek_iv!,
        doc.dek_tag!,
        doc.file_iv!,
        doc.file_tag!,
        user.id,
        documentId,
        doc.key_version || 1
      )
    } catch {
      return NextResponse.json(
        { error: 'Decryption failed: corrupted ciphertext or authentication tag mismatch' },
        { status: 500 }
      )
    }

    return createFileStreamResponse(
      plaintextBuffer,
      doc.filename,
      (doc as { mime_type?: string }).mime_type,
      'private, no-cache, no-store, must-revalidate',
      request.headers.get('range')
    )
  }

  let plaintextBuffer: Buffer
  try {
    const { buffer } = await storageService.downloadBuffer(
      doc.storage_path,
      (doc.storage_provider as StorageProvider) || undefined
    )
    plaintextBuffer = buffer
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve document' }, { status: 500 })
  }

  return createFileStreamResponse(
    plaintextBuffer,
    doc.filename,
    (doc as { mime_type?: string }).mime_type,
    'private, max-age=300',
    request.headers.get('range')
  )
}
