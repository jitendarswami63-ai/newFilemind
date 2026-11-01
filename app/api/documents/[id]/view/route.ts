import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { envelopeDecryptDocument } from '@/lib/crypto/document-encryption'
import { getServiceRoleClient, hasActiveBiometricLease } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

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
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, filename, storage_path, is_locked, encrypted_dek, dek_iv, dek_tag, file_iv, file_tag, key_version')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

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

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to retrieve encrypted document' }, { status: 500 })
    }

    const ciphertextBuffer = Buffer.from(await fileData.arrayBuffer())

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

    return new Response(new Uint8Array(plaintextBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': plaintextBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.filename)}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(doc.storage_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to retrieve document' }, { status: 500 })
  }

  const plaintextBuffer = Buffer.from(await fileData.arrayBuffer())

  return new Response(new Uint8Array(plaintextBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': plaintextBuffer.length.toString(),
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.filename)}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
