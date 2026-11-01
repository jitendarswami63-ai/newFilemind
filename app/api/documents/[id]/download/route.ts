import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VIEWER_SIGNED_URL_EXPIRY, DOWNLOAD_SIGNED_URL_EXPIRY } from '@/lib/constants'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { hasActiveBiometricLease } from '@/lib/auth/webauthn'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'viewer'

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
    .select('storage_path, is_locked')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error && (error.code === '42703' || error.message?.includes('is_locked'))) {
    const fallback = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    doc = fallback.data ? { ...fallback.data, is_locked: false } : null
    error = fallback.error
  }

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.is_locked) {
    const isLeaseActive = await hasActiveBiometricLease(user.id, id)
    if (!isLeaseActive) {
      return NextResponse.json(
        {
          error: 'Biometric authorization required to access this document.',
          code: 'BIOMETRIC_REQUIRED',
          is_locked: true,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      signedUrl: `/api/documents/${id}/view`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      storagePath: doc.storage_path,
      isEncryptedStream: true,
    })
  }

  const expiry = type === 'download' ? DOWNLOAD_SIGNED_URL_EXPIRY : VIEWER_SIGNED_URL_EXPIRY
  const { data: signedData, error: signError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, expiry, {
      download: type === 'download',
    })

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  const expiresAt = new Date(Date.now() + expiry * 1000).toISOString()

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    expiresAt,
    storagePath: doc.storage_path,
  })
}
