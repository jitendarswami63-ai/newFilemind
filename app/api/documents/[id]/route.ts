import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { hasActiveBiometricLease, revokeBiometricLease } from '@/lib/auth/webauthn'
import { storageService, StorageProvider } from '@/lib/storage/storage-service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error, code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user!

  let { data: doc, error } = await supabase
    .from('documents')
    .select(
      'id, filename, mime_type, file_size, original_file_size, storage_path, status, doc_category, tags, page_count, is_locked, locked_at, error_message, processing_locked_at, embedding_status, embedding_error, created_at, updated_at'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error && (error.code === '42703' || error.message?.includes('is_locked') || error.message?.includes('original_file_size'))) {
    const fallback = await supabase
      .from('documents')
      .select(
        'id, filename, mime_type, file_size, storage_path, status, doc_category, tags, page_count, error_message, processing_locked_at, embedding_status, embedding_error, created_at, updated_at'
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    doc = fallback.data ? { ...fallback.data, original_file_size: null, is_locked: false, locked_at: null } : null
    error = fallback.error
  }

  let isSharedRecipient = false
  let allowDownload = true

  if (error || !doc) {
    const { checkRestrictedDocumentAccess } = await import('@/lib/sharing/share-service')
    const restrictedCheck = await checkRestrictedDocumentAccess(id, user.id, user.email)

    if (restrictedCheck.authorized) {
      isSharedRecipient = true
      allowDownload = restrictedCheck.allowDownload

      const { createClient: createAdmin } = await import('@supabase/supabase-js')
      const adminSupabase = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: sharedDoc } = await adminSupabase
        .from('documents')
        .select(
          'id, filename, mime_type, file_size, storage_path, status, doc_category, tags, page_count, error_message, processing_locked_at, embedding_status, embedding_error, created_at, updated_at'
        )
        .eq('id', id)
        .single()

      if (sharedDoc) {
        doc = {
          ...sharedDoc,
          original_file_size: null,
          is_locked: false,
          locked_at: null,
        }
        error = null
      }
    }
  }

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
  }

  let isLeaseActive = true
  if (doc.is_locked) {
    isLeaseActive = await hasActiveBiometricLease(user.id, id)
  }

  return NextResponse.json({
    ...doc,
    is_lease_active: isLeaseActive,
    is_shared_recipient: isSharedRecipient,
    allow_download: allowDownload,
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error, code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user!

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path, storage_provider, is_locked')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.is_locked) {
    const isLeaseActive = await hasActiveBiometricLease(user.id, id)
    if (!isLeaseActive) {
      return NextResponse.json(
        { error: 'Biometric authorization required to delete a locked document', code: 'BIOMETRIC_REQUIRED' },
        { status: 403 }
      )
    }
  }

  if (doc.storage_path) {
    await storageService.deleteFile(doc.storage_path, (doc.storage_provider as StorageProvider) || undefined)
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }

  await revokeBiometricLease(user.id, id)

  return NextResponse.json({ success: true })
}
