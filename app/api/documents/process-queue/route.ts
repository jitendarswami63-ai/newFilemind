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
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized', code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user

  const entitlements = await getServerUserEntitlements(user.id, user.user_metadata, false)
  const byokApiKey =
    typeof user.user_metadata?.byok_gemini_key === 'string' && user.user_metadata.byok_gemini_key.trim()
      ? user.user_metadata.byok_gemini_key.trim()
      : undefined

  let body: { documentId?: string } = {}
  try {
    body = await request.json()
  } catch {}

  if (body.documentId) {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, user_id, filename, storage_path, status, processing_locked_at')
      .eq('id', body.documentId)
      .eq('user_id', user.id)
      .single()

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.status === 'completed') {
      return NextResponse.json({
        success: true,
        documentId: doc.id,
        status: 'completed',
        alreadyCompleted: true,
      })
    }

    if (!entitlements.hasAiFeatures) {
      try {
        const admin = createSupabaseAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const detectedFormat = detectFileFormat(doc.filename)
        const { buffer: fileBuf } = await storageService.downloadBuffer(doc.storage_path)
        let pageCount = 1
        if (fileBuf && detectedFormat.extension === 'pdf') {
          try {
            const pdfDoc = await PDFDocument.load(fileBuf, { ignoreEncryption: true })
            pageCount = pdfDoc.getPageCount()
          } catch {}
        }
        await admin
          .from('documents')
          .update({
            status: 'completed',
            page_count: pageCount,
            doc_category: detectedFormat.category || 'Standard Document',
            tags: ['Free Tier'],
            extracted_data: { notice: 'Free Tier storage - AI document understanding available on Pro & Elite' },
          })
          .eq('id', doc.id)

        return NextResponse.json({
          success: true,
          documentId: doc.id,
          status: 'completed',
        })
      } catch (freeErr) {
        console.error('[ProcessQueue] Free-tier finalization error:', freeErr)
        return NextResponse.json({ error: 'Processing error', documentId: doc.id }, { status: 500 })
      }
    }

    // Process directly with a 25-second fast race, and keep background task alive with after() on timeout!
    try {
      const fastProcessPromise = processUniversalFile(doc.id, undefined, byokApiKey)
      const fastTimeoutPromise = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 25_000))

      const raceResult = await Promise.race([fastProcessPromise, fastTimeoutPromise])

      if (raceResult === 'timeout') {
        after(async () => {
          try {
            await fastProcessPromise
          } catch (bgErr) {
            console.error('[ProcessQueue] Background continuation error:', bgErr)
          }
        })
        return NextResponse.json({
          success: true,
          documentId: doc.id,
          scheduled: true,
          status: 'processing',
        })
      }

      return NextResponse.json({
        success: raceResult,
        documentId: doc.id,
        status: raceResult ? 'completed' : 'failed',
      })
    } catch (procErr) {
      console.error('[ProcessQueue] Processing error:', procErr)
      return NextResponse.json(
        { error: 'Processing error', documentId: doc.id },
        { status: 500 }
      )
    }
  }

  if (!entitlements.hasAiFeatures) {
    return NextResponse.json({ success: true, processed: false, reason: 'free_tier_no_ai_queue' })
  }

  const { data: claimedDocs, error: claimError } = await supabase.rpc('claim_next_pending_document', {
    p_user_id: user.id,
  })

  if (claimError) {
    const { data: fallbackDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!fallbackDoc) {
      return NextResponse.json({ success: true, processed: false, reason: 'empty_queue' })
    }

    const processed = await processUniversalFile(fallbackDoc.id, undefined, byokApiKey)
    return NextResponse.json({
      success: processed,
      documentId: fallbackDoc.id,
      processed: true,
    })
  }

  const claimedDoc = Array.isArray(claimedDocs) && claimedDocs.length > 0 ? claimedDocs[0] : claimedDocs

  if (!claimedDoc || !claimedDoc.document_id) {
    return NextResponse.json({ success: true, processed: false, reason: 'empty_queue' })
  }

  try {
    const processed = await processUniversalFile(claimedDoc.document_id, claimedDoc.processing_token, byokApiKey)
    return NextResponse.json({
      success: processed,
      documentId: claimedDoc.document_id,
      processed: true,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json(
      { error: errorMsg, documentId: claimedDoc.document_id },
      { status: 500 }
    )
  }
}
