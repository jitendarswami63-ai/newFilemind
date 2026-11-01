import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { envelopeDecryptDocument } from '@/lib/crypto/document-encryption'
import { getServiceRoleClient, hasActiveBiometricLease } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

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

  const isLeaseActive = await hasActiveBiometricLease(user.id, documentId)
  if (!isLeaseActive) {
    return NextResponse.json(
      { error: 'Biometric authorization required to permanently unlock this document.', code: 'BIOMETRIC_REQUIRED' },
      { status: 403 }
    )
  }

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

  if (!doc.is_locked) {
    return NextResponse.json({ success: true, message: 'Document is not locked', is_locked: false })
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(doc.storage_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to retrieve encrypted document from vault' }, { status: 500 })
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
    return NextResponse.json({ error: 'Decryption failed: corrupted ciphertext or authentication tag mismatch' }, { status: 500 })
  }

  const plaintextStoragePath = doc.storage_path.endsWith('.enc')
    ? doc.storage_path.slice(0, -4)
    : `${doc.storage_path}.pdf`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(plaintextStoragePath, plaintextBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Failed to restore plaintext document: ${uploadError.message}` }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('documents')
    .update({
      is_locked: false,
      locked_at: null,
      encrypted_dek: null,
      dek_iv: null,
      dek_tag: null,
      file_iv: null,
      file_tag: null,
      storage_path: plaintextStoragePath,
    })
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 })
  }

  await supabaseAdmin.storage.from('documents').remove([doc.storage_path])

  return NextResponse.json({
    success: true,
    is_locked: false,
    documentId,
  })
}
