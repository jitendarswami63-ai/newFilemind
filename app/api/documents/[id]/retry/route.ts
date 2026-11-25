import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processUniversalFile } from '@/lib/files/processing-engine'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { getServerUserEntitlements } from '@/lib/subscription/plan-server'
import { storageService } from '@/lib/storage/storage-service'
import { detectFileFormat } from '@/lib/files/file-types'
import { PDFDocument } from 'pdf-lib'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized', code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, user_id, filename, storage_path, status, processing_locked_at, embedding_status, embedding_locked_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const entitlements = await getServerUserEntitlements(user.id, user.user_metadata, false)
  const byokApiKey =
    typeof user.user_metadata?.byok_gemini_key === 'string' && user.user_metadata.byok_gemini_key.trim()
      ? user.user_metadata.byok_gemini_key.trim()
      : undefined

  const isPending = doc.status === 'pending'
  const isFailed = doc.status === 'failed'

  let isStaleProcessing = false
  if (doc.status === 'processing') {
    if (doc.processing_locked_at) {
      const lockTime = new Date(doc.processing_locked_at).getTime()
      const TWO_MINUTES_MS = 2 * 60 * 1000
      if (Date.now() - lockTime > TWO_MINUTES_MS) {
        isStaleProcessing = true
      }
    } else {
      isStaleProcessing = true
    }
  }

  if (doc.status === 'completed') {
    if (doc.embedding_status !== 'completed') {
      if (!entitlements.hasAiFeatures) {
        return NextResponse.json(
          { error: 'AI semantic indexing requires Pro, Elite, or a Gemini BYOK key.' },
          { status: 403 }
        )
      }
      after(async () => {
        const { getServiceRoleClient } = await import('@/lib/ai/service-role-worker')
        const adminClient = getServiceRoleClient()
        await adminClient
          .from('documents')
          .update({
            embedding_status: 'pending',
            embedding_token: null,
            embedding_attempts: 0,
            embedding_error: null,
          })
          .eq('id', id)
          .eq('user_id', user.id)

        const { indexDocument } = await import('@/lib/ai/index-document')
        await indexDocument(id, byokApiKey)
      })

      return NextResponse.json({
        success: true,
        message: 'Document indexing retry scheduled.',
        documentId: id,
      })
    }

    return NextResponse.json(
      { error: 'Document processing and indexing have already completed successfully.' },
      { status: 409 }
    )
  }

  if (doc.status === 'processing' && !isStaleProcessing) {
    return NextResponse.json(
      { error: 'Document is currently being processed. Please wait.' },
      { status: 409 }
    )
  }

  if (!isPending && !isFailed && !isStaleProcessing) {
    return NextResponse.json(
      { error: 'Document is not in a retryable state.' },
      { status: 400 }
    )
  }

  if (!entitlements.hasAiFeatures) {
    after(async () => {
      try {
        const { getServiceRoleClient } = await import('@/lib/ai/service-role-worker')
        const adminClient = getServiceRoleClient()
        const detectedFormat = detectFileFormat(doc.filename)
        const { buffer: fileBuf } = await storageService.downloadBuffer(doc.storage_path)
        let pageCount = 1
        if (fileBuf && detectedFormat.extension === 'pdf') {
          try {
            const pdfDoc = await PDFDocument.load(fileBuf, { ignoreEncryption: true })
            pageCount = pdfDoc.getPageCount()
          } catch {}
        }
        await adminClient
          .from('documents')
          .update({
            status: 'completed',
            page_count: pageCount,
            doc_category: detectedFormat.category || 'Standard Document',
            tags: ['Free Tier'],
            extracted_data: { notice: 'Free Tier storage - AI document understanding available on Pro & Elite' },
          })
          .eq('id', id)
      } catch (freeErr) {
        console.warn('[Retry] Free-tier finalization error:', freeErr)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Free-tier document storage verification scheduled.',
      documentId: id,
    })
  }

  after(async () => {
    await processUniversalFile(id, undefined, byokApiKey)
  })

  return NextResponse.json({
    success: true,
    message: 'Document processing scheduled.',
    documentId: id,
  })
}
