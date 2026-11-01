import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { hasActiveBiometricLease, revokeBiometricLease } from '@/lib/auth/webauthn'

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

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  let isLeaseActive = true
  if (doc.is_locked) {
    isLeaseActive = await hasActiveBiometricLease(user.id, id)
  }

  return NextResponse.json({
    ...doc,
    is_lease_active: isLeaseActive,
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
    .select('storage_path, is_locked')
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
    await supabase.storage.from('documents').remove([doc.storage_path])
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
