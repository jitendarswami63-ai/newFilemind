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
  try {
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

    let recipientAllowDownload = true

    if (error || !doc) {
      // Check if user is an authorized recipient under restricted sharing
      const { checkRestrictedDocumentAccess } = await import('@/lib/sharing/share-service')
      const restrictedCheck = await checkRestrictedDocumentAccess(id, user.id, user.email)

      if (restrictedCheck.authorized) {
        recipientAllowDownload = restrictedCheck.allowDownload

        if (type === 'download' && !recipientAllowDownload) {
          return NextResponse.json(
            {
              error: 'The document owner has disabled downloads for this shared document.',
              code: 'DOWNLOAD_FORBIDDEN',
            },
            { status: 403 }
          )
        }

        // Fetch document storage_path via admin client since caller is a verified recipient
        const { createClient: createAdmin } = await import('@supabase/supabase-js')
        const adminSupabase = createAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { data: sharedDoc } = await adminSupabase
          .from('documents')
          .select('storage_path, is_locked')
          .eq('id', id)
          .single()

        if (sharedDoc) {
          doc = sharedDoc
          error = null
        }
      }
    }

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
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
    let { data: signedData, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, expiry, {
        download: type === 'download',
      })

    if (signError || !signedData?.signedUrl) {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient: createAdmin } = await import('@supabase/supabase-js')
          const adminSupabase = createAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          const { data: adminSigned, error: adminSignErr } = await adminSupabase.storage
            .from('documents')
            .createSignedUrl(doc.storage_path, expiry, {
              download: type === 'download',
            })
          if (!adminSignErr && adminSigned?.signedUrl) {
            signedData = adminSigned
            signError = null
          }
        } catch (adminErr) {
          console.error('[Download API] Fallback signing error:', adminErr)
        }
      }
    }

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Could not generate URL for document' }, { status: 500 })
    }

    const expiresAt = new Date(Date.now() + expiry * 1000).toISOString()

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      expiresAt,
      storagePath: doc.storage_path,
    })
  } catch (err: unknown) {
    console.error('[Download API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error generating viewer URL' },
      { status: 500 }
    )
  }
}
