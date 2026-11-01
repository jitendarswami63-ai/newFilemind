import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { envelopeEncryptDocument, envelopeDecryptDocument } from '@/lib/crypto/document-encryption'
import { getServiceRoleClient, listUserBiometricCredentials } from '@/lib/auth/webauthn'

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
    .select('id, user_id, filename, storage_path, is_locked')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.is_locked) {
    return NextResponse.json({ success: true, message: 'Document is already locked', is_locked: true })
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(doc.storage_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to retrieve document from storage' }, { status: 500 })
  }

  const plaintextBuffer = Buffer.from(await fileData.arrayBuffer())

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

  let uploadError = (
    await supabaseAdmin.storage
      .from('documents')
      .upload(encryptedStoragePath, envelope.ciphertextBuffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      })
  ).error

  if (uploadError) {
    const fallbackUpload = await supabaseAdmin.storage
      .from('documents')
      .upload(encryptedStoragePath, envelope.ciphertextBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
    uploadError = fallbackUpload.error
  }

  if (uploadError) {
    return NextResponse.json(
      { error: `Failed to save encrypted document to vault: ${uploadError.message}` },
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
    await supabaseAdmin.storage.from('documents').remove([encryptedStoragePath])
    return NextResponse.json({ error: `Failed to update document security status: ${updateError.message}` }, { status: 500 })
  }

  await supabaseAdmin.storage.from('documents').remove([doc.storage_path])

  return NextResponse.json({
    success: true,
    is_locked: true,
    documentId,
  })
}
