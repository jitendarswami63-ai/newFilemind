import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { hasActiveBiometricLease } from '@/lib/auth/webauthn'
import { TopBar } from '@/components/layout/TopBar'
import { PDFViewer } from '@/components/pdf/PDFViewer'
import { VaultMfaUnlockChallenge } from '@/components/auth/VaultMfaUnlockChallenge'
import { BiometricUnlockChallenge } from '@/components/auth/BiometricUnlockChallenge'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DocumentViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const sParams = searchParams ? await searchParams : undefined
  const rawPage = typeof sParams?.page === 'string' ? sParams.page : undefined
  const parsedPage = rawPage ? parseInt(rawPage, 10) : undefined
  const initialPage = parsedPage && !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : undefined

  const supabase = await createClient()
  const auth = await verifyVaultAccess(supabase)

  if (auth.status === 401 || !auth.user) {
    notFound()
  }

  if (auth.code === 'MFA_REQUIRED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
        <VaultMfaUnlockChallenge
          factorId={auth.factorId}
          customMessage="This document is stored in your Private Vault. Enter your 6-digit Google Authenticator code to unlock and view it."
        />
      </div>
    )
  }

  let { data: doc, error } = await supabase
    .from('documents')
    .select('id, filename, status, error_message, doc_category, tags, processing_locked_at, storage_path, embedding_status, is_locked')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single()

  if (error && (error.code === '42703' || error.message?.includes('is_locked'))) {
    const fallback = await supabase
      .from('documents')
      .select('id, filename, status, error_message, doc_category, tags, processing_locked_at, storage_path, embedding_status')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single()
    doc = fallback.data ? { ...fallback.data, is_locked: false } : null
    error = fallback.error
  }

  if (error || !doc) {
    // Check if the current user has restricted sharing authorization
    const { checkRestrictedDocumentAccess } = await import('@/lib/sharing/share-service')
    const restrictedAccess = await checkRestrictedDocumentAccess(id, auth.user.id, auth.user.email)

    if (restrictedAccess.authorized) {
      const { createClient: createAdmin } = await import('@supabase/supabase-js')
      const adminSupabase = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: sharedDoc } = await adminSupabase
        .from('documents')
        .select('id, filename, status, error_message, doc_category, tags, processing_locked_at, storage_path, embedding_status, is_locked')
        .eq('id', id)
        .single()

      if (sharedDoc) {
        doc = sharedDoc
        error = null
      }
    }
  }

  if (error || !doc) {
    notFound()
  }

  const isLocked = Boolean(doc.is_locked)
  let isLeaseActive = false
  if (isLocked) {
    isLeaseActive = await hasActiveBiometricLease(auth.user.id, doc.id)
  }

  if (isLocked && !isLeaseActive) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          documentId={doc.id}
          filename={doc.filename}
          isLocked={true}
          isLeaseActive={false}
        />
        <div className="flex flex-col items-center justify-center min-h-[65vh] w-full px-4">
          <BiometricUnlockChallenge
            documentId={doc.id}
            documentTitle={doc.filename}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        documentId={doc.id}
        filename={doc.filename}
        isLocked={isLocked}
        isLeaseActive={isLeaseActive}
      />
      <PDFViewer
        documentId={doc.id}
        initialStatus={doc.status}
        initialEmbeddingStatus={doc.embedding_status}
        errorMessage={doc.error_message}
        initialCategory={doc.doc_category}
        initialTags={doc.tags}
        initialLockedAt={doc.processing_locked_at}
        initialPage={initialPage}
        storagePath={doc.storage_path}
        isLocked={isLocked}
      />
    </div>
  )
}
