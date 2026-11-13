import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { envelopeEncryptDocument, envelopeDecryptDocument } from '@/lib/crypto/document-encryption'
import { getServiceRoleClient, listUserBiometricCredentials } from '@/lib/auth/webauthn'
import { storageService, StorageProvider } from '@/lib/storage/storage-service'

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

  const creds = await listUserBiometricCredentials(user.id)
  if (creds.length === 0) {
    return NextResponse.json(
      { error: 'Please enroll Windows Hello or Touch ID in Settings before locking sensitive documents.' },
      { status: 400 }
    )
  }

  const supabaseAdmin = getServiceRoleClient()

  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, filename, storage_path, storage_provider, is_locked')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.is_locked) {
    return NextResponse.json({ success: true, message: 'Document is already locked', is_locked: true })
  }

  let plaintextBuffer: Buffer
  try {
    const { buffer } = await storageService.downloadBuffer(
      doc.storage_path,
      (doc.storage_provider as StorageProvider) || undefined
    )
    plaintextBuffer = buffer
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve document from storage' }, { status: 500 })
  }

  const envelope = envelopeEncryptDocument(plaintextBuffer, user.id, documentId, 1)

  try {
    const verifiedPlaintext = envelopeDecryptDocument(
      envelope.ciphertextBuffer,
      envelope.encryptedDek,
      envelope.dekIv,
      envelope.dekTag,
      envelope.fileIv,
      envelope.fileTag,
      user.id,
      documentId,
      1
    )
    if (!verifiedPlaintext.equals(plaintextBuffer)) {
      throw new Error('Integrity self-test mismatch')
    }
  } catch {
    return NextResponse.json({ error: 'Encryption integrity self-test failed. Aborting.' }, { status: 500 })
  }

  const encryptedStoragePath = `${doc.storage_path}.enc`

  try {
    await storageService.uploadBuffer(
      encryptedStoragePath,
      envelope.ciphertextBuffer,
      'application/octet-stream'
    )
  } catch (uploadErr) {
    return NextResponse.json(
      { error: `Failed to save encrypted document to vault: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}` },
      { status: 500 }
    )
  }

  const { error: updateError } = await supabaseAdmin
    .from('documents')
    .update({
      is_locked: true,
      locked_at: new Date().toISOString(),
      key_version: 1,
      encrypted_dek: envelope.encryptedDek,
      dek_iv: envelope.dekIv,
      dek_tag: envelope.dekTag,
      file_iv: envelope.fileIv,
      file_tag: envelope.fileTag,
      storage_path: encryptedStoragePath,
    })
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (updateError) {
    await storageService.deleteFile(encryptedStoragePath, (doc.storage_provider as StorageProvider) || undefined)
    return NextResponse.json({ error: `Failed to update document security status: ${updateError.message}` }, { status: 500 })
  }

  await storageService.deleteFile(doc.storage_path, (doc.storage_provider as StorageProvider) || undefined)

  return NextResponse.json({
    success: true,
    is_locked: true,
    documentId,
  })
}
